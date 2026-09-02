'use client'
// features/missions/components/AddActivityForm.tsx
//
// MIGRATION 094 REWRITE (2026-09-01): an activity is now a CONTAINER
// holding multiple questions, each with its own options — this form
// previously built ONE flat prompt/options/correctAnswer set and sent
// it directly as `formData.set('prompt', ...)` etc., which never
// matched addActivity's already-rewritten contract (a JSON `questions`
// array). That mismatch meant this form could not actually create a
// working activity against the current schema at all — this is a real
// functional fix, not a style pass.
//
// Each question block below is independently typed-into/validated,
// mirroring the exact per-question shape addActivity's
// questionInputSchema expects: { prompt, questionType, options
// (comma-joined string, multiple_choice_single only), correctAnswer,
// hintText }. The activity-level field (remediatesActivityId) is
// unchanged — remediation still applies to the whole activity
// container, not to an individual question.
//
// Preview panel: extended to loop over every question block in order,
// same tactile-tile treatment as before, so a teacher can proof the
// whole mini-quiz-within-a-mission before saving, not just its first
// question.

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Lightbulb, Eye, Plus } from 'lucide-react'
import { addActivity } from '@/features/missions/actions/create-activity'

type QuestionType = 'multiple_choice_single' | 'true_false'

type ExistingActivity = {
    id: string
    // Activities have no prompt of their own anymore — the real shape
    // getMissionForTeacher returns nests questions underneath. Same
    // fix as ActivityCard.tsx's labelForActivity; missed here
    // originally, causing a runtime crash on any mission with an
    // existing activity.
    questions: { prompt: string }[]
}

let keySeed = 0
function nextKey(prefix: string) {
    keySeed += 1
    return `${prefix}-${keySeed}`
}

function makeEmptyOption() {
    return { key: nextKey('option'), text: '' }
}

function makeEmptyQuestion() {
    return {
        key: nextKey('question'),
        questionType: 'multiple_choice_single' as QuestionType,
        prompt: '',
        options: [makeEmptyOption(), makeEmptyOption()],
        correctIndex: null as number | null,
        correctTf: 'True' as 'True' | 'False',
        hintText: '',
    }
}

type QuestionDraft = ReturnType<typeof makeEmptyQuestion>

export function AddActivityForm({
    missionId,
    existingActivities = [],
}: {
    missionId: string
    existingActivities?: ExistingActivity[]
}) {
    const router = useRouter()
    const [questions, setQuestions] = useState<QuestionDraft[]>([makeEmptyQuestion()])
    const [remediatesActivityId, setRemediatesActivityId] = useState('')
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    function updateQuestion(key: string, patch: Partial<QuestionDraft>) {
        setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)))
    }

    function addQuestionBlock() {
        setQuestions((prev) => [...prev, makeEmptyQuestion()])
    }

    function removeQuestionBlock(key: string) {
        setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.key !== key) : prev))
    }

    function updateOptionText(questionKey: string, optionKey: string, text: string) {
        setQuestions((prev) =>
            prev.map((q) =>
                q.key === questionKey
                    ? { ...q, options: q.options.map((o) => (o.key === optionKey ? { ...o, text } : o)) }
                    : q
            )
        )
    }

    function addOptionRow(questionKey: string) {
        setQuestions((prev) =>
            prev.map((q) => (q.key === questionKey ? { ...q, options: [...q.options, makeEmptyOption()] } : q))
        )
    }

    function removeOptionRow(questionKey: string, optionKey: string) {
        setQuestions((prev) =>
            prev.map((q) => {
                if (q.key !== questionKey) return q
                const removedIndex = q.options.findIndex((o) => o.key === optionKey)
                const nextOptions = q.options.filter((o) => o.key !== optionKey)
                let nextCorrectIndex = q.correctIndex
                if (nextCorrectIndex !== null) {
                    if (removedIndex === nextCorrectIndex) nextCorrectIndex = null
                    else if (removedIndex < nextCorrectIndex) nextCorrectIndex = nextCorrectIndex - 1
                }
                return { ...q, options: nextOptions, correctIndex: nextCorrectIndex }
            })
        )
    }

    function resetForm() {
        setQuestions([makeEmptyQuestion()])
        setRemediatesActivityId('')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        for (const q of questions) {
            if (!q.prompt.trim()) {
                setError('Every question needs a prompt.')
                return
            }
            if (q.questionType === 'multiple_choice_single') {
                const filled = q.options.map((o) => o.text.trim()).filter(Boolean)
                if (filled.length < 2) {
                    setError('Each multiple choice question needs at least two answer options.')
                    return
                }
                if (q.correctIndex === null || !q.options[q.correctIndex]?.text.trim()) {
                    setError('Click the bullet next to each question\u2019s correct answer.')
                    return
                }
            }
        }

        // Matches addActivity's questionInputSchema exactly: prompt,
        // questionType, options (comma-joined, MC only), correctAnswer,
        // hintText. Sent as one JSON array under the `questions` field,
        // same convention create-activity.ts's own header documents.
        const questionsPayload = questions.map((q) => {
            if (q.questionType === 'true_false') {
                return {
                    prompt: q.prompt.trim(),
                    questionType: q.questionType,
                    correctAnswer: q.correctTf,
                    hintText: q.hintText.trim() || undefined,
                }
            }
            const filledOptions = q.options.map((o) => o.text.trim()).filter(Boolean)
            const correctOption = q.correctIndex !== null ? q.options[q.correctIndex] : undefined
            return {
                prompt: q.prompt.trim(),
                questionType: q.questionType,
                options: filledOptions.join(','),
                correctAnswer: correctOption?.text.trim() ?? '',
                hintText: q.hintText.trim() || undefined,
            }
        })

        const formData = new FormData()
        formData.set('missionId', missionId)
        formData.set('questions', JSON.stringify(questionsPayload))
        if (remediatesActivityId) formData.set('remediatesActivityId', remediatesActivityId)

        setIsPending(true)
        const result = await addActivity(formData)
        setIsPending(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        resetForm()
        router.refresh()
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            {/* ── Classroom Mode form controls ────────────────────────────── */}
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 bg-surface rounded-md border border-hairline shadow-card p-6">
                {questions.map((q, qIndex) => (
                    <div
                        key={q.key}
                        className="space-y-4 rounded-md border border-hairline p-4"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-label text-ink-soft">Question {qIndex + 1}</p>
                            {questions.length > 1 && (
                                <button
                                    type="button"
                                    aria-label={`Remove question ${qIndex + 1}`}
                                    onClick={() => removeQuestionBlock(q.key)}
                                    className="text-text-secondary hover:text-error p-1 rounded-md transition-colors"
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        <div>
                            <label htmlFor={`questionType-${q.key}`} className="text-label text-ink-soft block mb-2">
                                Question type
                            </label>
                            <select
                                id={`questionType-${q.key}`}
                                value={q.questionType}
                                onChange={(e) => updateQuestion(q.key, { questionType: e.target.value as QuestionType })}
                                className="w-full h-11 px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                            >
                                <option value="multiple_choice_single">Multiple choice</option>
                                <option value="true_false">True / False</option>
                            </select>
                        </div>

                        <textarea
                            aria-label={`Question ${qIndex + 1} prompt`}
                            rows={2}
                            required
                            value={q.prompt}
                            onChange={(e) => updateQuestion(q.key, { prompt: e.target.value })}
                            className="w-full px-5 py-3 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                            placeholder="Type the question prompt here"
                        />

                        {q.questionType === 'multiple_choice_single' && (
                            <div className="space-y-2">
                                <p className="text-caption text-text-secondary">Click the bullet to mark the correct answer</p>
                                {q.options.map((option, optIndex) => (
                                    <div key={option.key} className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            aria-label={`Mark option ${optIndex + 1} as correct`}
                                            onClick={() => updateQuestion(q.key, { correctIndex: optIndex })}
                                            className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${
                                                q.correctIndex === optIndex
                                                    ? 'border-brand bg-brand text-on-ink'
                                                    : 'border-hairline hover:border-brand'
                                            }`}
                                        >
                                            {q.correctIndex === optIndex && (
                                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                        <input
                                            type="text"
                                            value={option.text}
                                            onChange={(e) => updateOptionText(q.key, option.key, e.target.value)}
                                            placeholder={`Option ${optIndex + 1}`}
                                            className="flex-1 min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                                        />
                                        {q.options.length > 2 && (
                                            <button
                                                type="button"
                                                aria-label={`Remove option ${optIndex + 1}`}
                                                onClick={() => removeOptionRow(q.key, option.key)}
                                                className="text-text-secondary hover:text-error p-2 rounded-md transition-colors"
                                            >
                                                <X size={18} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addOptionRow(q.key)}
                                    className="text-caption font-semibold text-text-secondary hover:text-ink pl-8"
                                >
                                    + Add option
                                </button>
                            </div>
                        )}

                        {q.questionType === 'true_false' && (
                            <div className="space-y-2">
                                <p className="text-caption text-text-secondary">Click the bullet to mark the correct answer</p>
                                {(['True', 'False'] as const).map((label) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            aria-label={`Mark ${label} as correct`}
                                            onClick={() => updateQuestion(q.key, { correctTf: label })}
                                            className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${
                                                q.correctTf === label
                                                    ? 'border-brand bg-brand text-on-ink'
                                                    : 'border-hairline hover:border-brand'
                                            }`}
                                        >
                                            {q.correctTf === label && (
                                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                        <span className="text-body-md text-ink">{label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label htmlFor={`hint-${q.key}`} className="text-label text-ink-soft block mb-2">
                                Hint (optional — shown after 2 wrong attempts)
                            </label>
                            <textarea
                                id={`hint-${q.key}`}
                                rows={2}
                                value={q.hintText}
                                onChange={(e) => updateQuestion(q.key, { hintText: e.target.value })}
                                placeholder="A nudge in the right direction, not the answer itself"
                                className="w-full px-5 py-3 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                            />
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addQuestionBlock}
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-md border-2 border-dashed border-hairline text-caption font-semibold text-brand hover:border-brand hover:bg-brand-soft transition-colors"
                >
                    <Plus size={16} aria-hidden="true" />
                    Add another question to this activity
                </button>

                {existingActivities.length > 0 && (
                    <div>
                        <label htmlFor="addActivityRemediation" className="text-label text-ink-soft block mb-2">
                            Remediation (optional — shown after repeated wrong answers)
                        </label>
                        <select
                            id="addActivityRemediation"
                            value={remediatesActivityId}
                            onChange={(e) => setRemediatesActivityId(e.target.value)}
                            className="w-full min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                        >
                            <option value="">None</option>
                            {existingActivities.map((a) => {
                                const label = a.questions[0]?.prompt ?? '(no questions)'
                                return (
                                    <option key={a.id} value={a.id}>
                                        {label.length > 70 ? `${label.slice(0, 70)}…` : label}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                )}

                {error && (
                    <p className="text-caption text-error" role="alert">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-md bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md transition-colors disabled:opacity-60"
                >
                    {isPending ? 'Adding…' : 'Add activity'}
                </button>
            </form>

            {/* ── Mission Mode live preview — student-facing look only ───── */}
            <div className="lg:sticky lg:top-6">
                <div className="flex items-center gap-2 mb-3 text-text-secondary">
                    <Eye size={16} aria-hidden="true" />
                    <p className="text-caption font-semibold uppercase tracking-wide">
                        Student preview
                    </p>
                </div>

                {!questions.some((q) => q.prompt.trim()) ? (
                    <div className="rounded-2xl border-2 border-dashed border-hairline p-8 text-center">
                        <p className="font-sans text-caption text-text-muted">
                            Start typing a prompt to see how this activity will look to students.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions
                            .filter((q) => q.prompt.trim())
                            .map((q, i) => (
                                <div key={q.key} className="rounded-2xl bg-surface-sunken border-2 border-hairline p-6">
                                    <p className="font-sans text-caption text-text-muted mb-2">Question {i + 1}</p>
                                    <p className="font-heading text-mission md:text-[1.75rem] text-ink mb-5">
                                        {q.prompt.trim()}
                                    </p>

                                    {q.questionType === 'multiple_choice_single' && (
                                        <div className="space-y-3">
                                            {q.options
                                                .map((option, index) => ({ option, index }))
                                                .filter(({ option }) => option.text.trim().length > 0)
                                                .map(({ option, index }) => {
                                                    const isCorrect = q.correctIndex === index
                                                    return (
                                                        <div
                                                            key={option.key}
                                                            className={`w-full min-h-[60px] p-4 rounded-2xl border-2 border-b-4 flex items-center justify-between text-left ${
                                                                isCorrect
                                                                    ? 'bg-success-soft border-success border-b-success'
                                                                    : 'bg-surface border-hairline border-b-hairline-strong'
                                                            }`}
                                                        >
                                                            <span className="font-sans font-bold text-base text-ink">
                                                                {option.text}
                                                            </span>
                                                            {isCorrect && (
                                                                <span className="shrink-0 font-sans text-caption font-semibold text-success">
                                                                    Correct answer
                                                                </span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            {q.options.every((o) => !o.text.trim()) && (
                                                <p className="font-sans text-caption text-text-muted">
                                                    Add answer options to preview them here.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {q.questionType === 'true_false' && (
                                        <div className="space-y-3">
                                            {(['True', 'False'] as const).map((label) => {
                                                const isCorrect = q.correctTf === label
                                                return (
                                                    <div
                                                        key={label}
                                                        className={`w-full min-h-[60px] p-4 rounded-2xl border-2 border-b-4 flex items-center justify-between text-left ${
                                                            isCorrect
                                                                ? 'bg-success-soft border-success border-b-success'
                                                                : 'bg-surface border-hairline border-b-hairline-strong'
                                                        }`}
                                                    >
                                                        <span className="font-sans font-bold text-base text-ink">{label}</span>
                                                        {isCorrect && (
                                                            <span className="shrink-0 font-sans text-caption font-semibold text-success">
                                                                Correct answer
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {q.hintText.trim() && (
                                        <div className="mt-5 flex items-start gap-2 rounded-md bg-warning-soft p-3">
                                            <Lightbulb size={16} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                                            <p className="font-sans text-caption text-ink-soft">{q.hintText.trim()}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        <p className="font-sans text-caption text-text-muted">
                            Correct answers are marked here for your reference only — students never see this
                            until after they submit.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
