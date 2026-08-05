'use client'
// One "Save changes" button for every quiz setting, replacing five
// separate self-saving cards (GradingComponentSetting, TimeLimitSetting,
// QuizDeadlineSetting, PassingScoreSetting, ResultsVisibilitySetting) —
// explicit request: too many individual save buttons on one page.
// Question content itself (adding/editing individual questions via
// AddQuestionForm/QuestionCard) stays separate on the edit page — that's
// content, not a setting, and each question already has its own
// dedicated save action per card.
//
// All five setters run in parallel via Promise.all rather than
// sequentially — they're independent columns on the same `quizzes` row,
// so there's no ordering dependency, and running them together means
// one combined "Saving…" state instead of five staggered ones.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import {
    setGradingComponent,
    setTimeLimit,
    setQuizDeadline,
    setPassingScore,
    setResultsVisibility,
    type GradingComponent,
    type ResultsVisibility,
} from '@/features/quizzes/actions/create-quiz'

const COMPONENT_LABEL: Record<GradingComponent, string> = {
    written_work: 'Written Work',
    performance_task: 'Performance Task',
    quarterly_assessment: 'Quarterly Assessment',
}

const VISIBILITY_OPTIONS: { value: ResultsVisibility; label: string }[] = [
    { value: 'immediately', label: 'Right after submitting' },
    { value: 'after_grading', label: 'Only after grading is complete' },
    { value: 'never', label: "Never — just show pass/fail, no per-question detail" },
]

// Same local-time-parsing trick as QuizDeadlineSetting.tsx originally
// used — a naive "YYYY-MM-DDTHH:mm" string is parsed as LOCAL time by
// the JS engine, so this produces a real, unambiguous UTC instant.
function toDatetimeLocalValue(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function QuizSettingsForm({
    quizId,
    currentGradingComponent,
    currentTimeLimitMinutes,
    currentAvailableUntil,
    currentAllowLate,
    totalQuestions,
    currentPassingScore,
    currentVisibility,
}: {
    quizId: string
    currentGradingComponent: GradingComponent
    currentTimeLimitMinutes: number | null
    currentAvailableUntil: string | null
    currentAllowLate: boolean
    totalQuestions: number
    currentPassingScore: number
    currentVisibility: ResultsVisibility
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [saved, setSaved] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    const [gradingComponent, setGradingComponentValue] = useState<GradingComponent>(currentGradingComponent)

    const [timerEnabled, setTimerEnabled] = useState(currentTimeLimitMinutes !== null)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(currentTimeLimitMinutes?.toString() ?? '')

    const [dueAt, setDueAt] = useState(toDatetimeLocalValue(currentAvailableUntil))
    const [allowLate, setAllowLate] = useState(currentAllowLate)

    const [passingScore, setPassingScoreValue] = useState(currentPassingScore)

    const [visibility, setVisibility] = useState<ResultsVisibility>(currentVisibility)

    function handleSaveAll() {
        setSaved(false)
        setErrors([])

        const parsedTimeLimit = timerEnabled ? parseInt(timeLimitMinutes, 10) : null
        if (timerEnabled && (Number.isNaN(parsedTimeLimit as number) || (parsedTimeLimit as number) < 1)) {
            setErrors(['Time limit must be at least 1 minute.'])
            return
        }

        const dueAtISO = dueAt ? new Date(dueAt).toISOString() : null

        startTransition(async () => {
            const results = await Promise.all([
                setGradingComponent(quizId, gradingComponent),
                setTimeLimit(quizId, parsedTimeLimit),
                setQuizDeadline(quizId, dueAtISO, allowLate),
                totalQuestions > 0 ? setPassingScore(quizId, passingScore) : Promise.resolve({ ok: true as const }),
                setResultsVisibility(quizId, visibility),
            ])

            const failures = results.filter((r) => !r.ok).map((r: any) => r.error as string)

            if (failures.length > 0) {
                setErrors(failures)
                return
            }

            setSaved(true)
            router.refresh()
        })
    }

    return (
        <div className="bg-surface rounded-md border border-hairline shadow-card p-6 mb-8 space-y-8">
            <div>
                <label htmlFor="gradingComponentSetting" className="text-label text-ink-soft block mb-2">
                    Grading component
                </label>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        id="gradingComponentSetting"
                        value={gradingComponent}
                        onChange={(e) => setGradingComponentValue(e.target.value as GradingComponent)}
                        className="h-11 px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    >
                        {(Object.keys(COMPONENT_LABEL) as GradingComponent[]).map((key) => (
                            <option key={key} value={key}>
                                {COMPONENT_LABEL[key]}
                            </option>
                        ))}
                    </select>
                    <span className="text-body-md text-text-secondary">
                        Counts toward this quiz&apos;s DepEd grading weight
                    </span>
                </div>
            </div>

            <div className="border-t border-hairline pt-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <span className="h-9 w-9 rounded-pill bg-info-soft flex items-center justify-center shrink-0">
                            <Clock className="h-4 w-4 text-info" />
                        </span>
                        <div>
                            <p className="text-body-emphasis text-ink">Time limit</p>
                            <p className="text-caption text-text-secondary">
                                {timerEnabled ? 'Set a duration below' : 'No timer — students can take as long as needed'}
                            </p>
                        </div>
                    </div>
                    <span
                        className={`shrink-0 rounded-pill px-3 py-1 text-caption font-semibold ${
                            timerEnabled ? 'bg-info-soft text-info' : 'bg-surface-sunken text-text-muted'
                        }`}
                    >
                        {timerEnabled ? 'Timed' : 'Untimed'}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-body-md text-ink cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={timerEnabled}
                            onChange={(e) => setTimerEnabled(e.target.checked)}
                            className="h-4 w-4 accent-brand"
                        />
                        Enable timer
                    </label>
                    {timerEnabled && (
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={1}
                                value={timeLimitMinutes}
                                onChange={(e) => setTimeLimitMinutes(e.target.value)}
                                placeholder="Minutes"
                                className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                            />
                            <span className="text-caption text-text-secondary">minutes</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-hairline pt-6">
                <p className="text-body-emphasis text-ink mb-1">Deadline</p>
                <p className="text-caption text-text-secondary mb-4">
                    After this time, students can no longer start the quiz — and if late submissions
                    aren&apos;t allowed, anyone still mid-attempt is cut off too, the same as the time
                    limit running out.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                    <input
                        type="datetime-local"
                        value={dueAt}
                        onChange={(e) => setDueAt(e.target.value)}
                        className="h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <button
                        type="button"
                        onClick={() => setDueAt('')}
                        disabled={!dueAt}
                        className="text-caption font-medium text-text-secondary hover:text-error disabled:opacity-40"
                    >
                        Clear
                    </button>
                </div>
                <div className="flex items-center gap-3 mt-4">
                    <input
                        id={`allowLate-${quizId}`}
                        type="checkbox"
                        checked={allowLate}
                        onChange={(e) => setAllowLate(e.target.checked)}
                        className="h-5 w-5 rounded border-[1.5px] border-hairline-strong text-brand focus:ring-2 focus:ring-brand/30"
                    />
                    <label htmlFor={`allowLate-${quizId}`} className="text-body-md text-ink">
                        Allow late starts and submissions
                    </label>
                </div>
            </div>

            {totalQuestions > 0 && (
                <div className="border-t border-hairline pt-6">
                    <label htmlFor="passingScoreSetting" className="text-label text-ink-soft block mb-2">
                        How many correct answers are needed to pass
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            id="passingScoreSetting"
                            type="number"
                            min={0}
                            max={totalQuestions}
                            value={passingScore}
                            onChange={(e) => setPassingScoreValue(Number(e.target.value))}
                            className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                        <span className="text-body-md text-text-secondary">out of {totalQuestions} questions</span>
                    </div>
                </div>
            )}

            <div className="border-t border-hairline pt-6">
                <label htmlFor="resultsVisibilitySetting" className="text-label text-ink-soft block mb-2">
                    When can students see which answers were correct
                </label>
                <select
                    id="resultsVisibilitySetting"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as ResultsVisibility)}
                    className="min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink"
                >
                    {VISIBILITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {errors.length > 0 && (
                <div className="border-t border-hairline pt-6">
                    {errors.map((e, i) => (
                        <p key={i} className="text-caption text-error" role="alert">
                            {e}
                        </p>
                    ))}
                </div>
            )}

            <div className="border-t border-hairline pt-6 flex items-center gap-3">
                <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={isPending}
                    className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60"
                >
                    {isPending ? 'Saving…' : 'Save changes'}
                </button>
                {saved && !isPending && (
                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                        All settings saved
                    </span>
                )}
            </div>
        </div>
    )
}
