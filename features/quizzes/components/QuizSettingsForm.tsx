'use client'
// features/quizzes/components/QuizSettingsForm.tsx
//
// 2026-08-19 — MERGED with the old PostQuizButton.tsx. Previously
// this form had its own "Save changes" button, and posting the quiz
// was a completely separate button further down the page — explicit
// feedback was that two buttons for what felt like one decision
// ("set this up, then make it live") was confusing. Now there is one
// button: it saves every setting below AND posts the quiz in the same
// action, via the new saveQuizSettingsAndPublish (one combined
// database update, replacing four separate setter calls +
// toggleQuizPublish run separately).
//
// The individual setters (setTimeLimit, setMaxAttempts, etc.) and
// toggleQuizPublish are untouched and still exported from
// create-quiz.ts, just no longer called from here.
//
// Unposting (an already-published quiz going back to draft) is kept
// as its own small, separate action below the main button — that's a
// distinct "take this down" decision, not part of "set up and post,"
// so collapsing it into the same button would hide a fairly
// consequential action inside routine settings edits.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import {
    saveQuizSettingsAndPublish,
    toggleQuizPublish,
    type ResultsVisibility,
} from '@/features/quizzes/actions/create-quiz'

const VISIBILITY_OPTIONS: { value: ResultsVisibility; label: string }[] = [
    { value: 'submission', label: 'Right after submitting' },
    { value: 'grading', label: 'Only after grading is complete' },
    { value: 'never', label: 'Never — just show the score, no per-question detail' },
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
    courseId,
    currentTimeLimitMinutes,
    currentMaxAttempts,
    currentAvailableUntil,
    currentAllowLate,
    totalQuestions,
    currentVisibility,
    isPublished,
}: {
    quizId: string
    courseId: string
    currentTimeLimitMinutes: number | null
    currentMaxAttempts: number
    currentAvailableUntil: string | null
    currentAllowLate: boolean
    totalQuestions: number
    currentVisibility: ResultsVisibility
    isPublished: boolean
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isUnposting, startUnpostTransition] = useTransition()
    const [saved, setSaved] = useState(false)
    const [errors, setErrors] = useState<string[]>([])
    const [published, setPublished] = useState(isPublished)

    const [timerEnabled, setTimerEnabled] = useState(currentTimeLimitMinutes !== null)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(currentTimeLimitMinutes?.toString() ?? '')

    const [maxAttempts, setMaxAttemptsValue] = useState(currentMaxAttempts)

    const [dueAt, setDueAt] = useState(toDatetimeLocalValue(currentAvailableUntil))
    const [allowLate, setAllowLate] = useState(currentAllowLate)

    const [visibility, setVisibility] = useState<ResultsVisibility>(currentVisibility)

    const hasQuestions = totalQuestions > 0

    function handleSaveAndPost() {
        setSaved(false)
        setErrors([])

        const parsedTimeLimit = timerEnabled ? parseInt(timeLimitMinutes, 10) : null
        if (timerEnabled && (Number.isNaN(parsedTimeLimit as number) || (parsedTimeLimit as number) < 1)) {
            setErrors(['Time limit must be at least 1 minute.'])
            return
        }

        if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
            setErrors(['Max attempts must be at least 1.'])
            return
        }

        if (!hasQuestions) {
            setErrors(['Add at least one question before posting.'])
            return
        }

        const dueAtISO = dueAt ? new Date(dueAt).toISOString() : null

        const formData = new FormData()
        formData.set('quizId', quizId)
        if (parsedTimeLimit !== null) formData.set('timeLimitMinutes', String(parsedTimeLimit))
        formData.set('maxAttempts', String(maxAttempts))
        formData.set('resultsVisibility', visibility)
        if (dueAtISO) formData.set('availableUntil', dueAtISO)
        formData.set('allowLate', String(allowLate))
        formData.set('publish', 'true')

        startTransition(async () => {
            const result = await saveQuizSettingsAndPublish(formData)

            if (!result.ok) {
                setErrors([result.error])
                return
            }

            setPublished(true)
            setSaved(true)
            // Posting is the "I'm done" action — send the teacher back
            // to the course page to see it live, same as posting an
            // assignment/lesson already does.
            router.push(`/teacher/courses/${courseId}`)
        })
    }

    function handleUnpost() {
        setErrors([])
        startUnpostTransition(async () => {
            const result = await toggleQuizPublish(quizId, false)
            if (!result.ok) {
                setErrors([result.error])
                return
            }
            setPublished(false)
            router.refresh()
        })
    }

    return (
        <div className="bg-surface rounded-md border border-hairline shadow-card p-6 mb-8 space-y-8">
            <div>
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
                <label htmlFor="maxAttemptsSetting" className="text-label text-ink-soft block mb-2">
                    Attempts allowed
                </label>
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        id="maxAttemptsSetting"
                        type="number"
                        min={1}
                        value={maxAttempts}
                        onChange={(e) => setMaxAttemptsValue(Number(e.target.value))}
                        className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <span className="text-body-md text-text-secondary">
                        {maxAttempts === 1
                            ? 'A student may take this quiz once'
                            : `A student may take this quiz up to ${maxAttempts} times — the most recent attempt is always the one that counts`}
                    </span>
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

            <div className="border-t border-hairline pt-6">
                {published ? (
                    <div className="flex items-center justify-between gap-4 bg-brand-soft rounded-md p-5">
                        <div>
                            <p className="text-body-emphasis text-brand">Posted</p>
                            <p className="text-caption text-text-secondary mt-0.5">
                                Students in this course can see this quiz. Settings above still
                                save and apply immediately — no need to unpost first.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={handleSaveAndPost}
                                disabled={isPending}
                                className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60"
                            >
                                {isPending ? 'Saving…' : 'Save settings'}
                            </button>
                            <button
                                type="button"
                                onClick={handleUnpost}
                                disabled={isUnposting}
                                className="h-11 px-5 rounded-md border-[1.5px] border-hairline-strong text-body-md font-semibold text-ink hover:bg-surface-sunken disabled:opacity-60"
                            >
                                {isUnposting ? 'Working…' : 'Unpost'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSaveAndPost}
                            disabled={isPending || !hasQuestions}
                            className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60"
                        >
                            {isPending ? 'Posting…' : 'Save & Post'}
                        </button>
                        {!hasQuestions && (
                            <span className="text-caption text-text-secondary">
                                Add at least one question first
                            </span>
                        )}
                        {saved && !isPending && (
                            <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                                Posted
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
