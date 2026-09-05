'use client'
// features/quizzes/components/NewQuizForm.tsx
//
// Replaces the old flow where clicking "Create > Quiz" immediately
// inserted an empty quizzes row via createDraftQuiz, before the
// teacher had entered a title or any content — that empty row was a
// real draft as far as the database and getTeacherCourseStream were
// concerned, so it showed up in the course stream the instant the
// button was clicked. This form collects a title AND every question
// client-side, and only calls the server (via createQuizWithQuestions)
// once — nothing is written to the database until there's real
// content to write.
//
// 2026-09-06: Reworked from a single-question form into a stacked
// list of question cards, same idea as the edit page's QuestionCard
// list + AddQuestionForm pinned at the bottom — "Add another
// question" was always available there, and this page should feel no
// different just because the quiz doesn't exist in the database yet.
// Each card's fields mirror AddQuestionForm's exact shape (option
// rows, correct-answer marking, all four question types); only the
// container — an array of drafts instead of one set of fields, plus a
// remove button per card once there's more than one — is new.

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createQuizWithQuestions } from '@/features/quizzes/actions/create-quiz'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

type QuestionType = 'multiple_choice_single' | 'true_false' | 'checklist' | 'short_answer'

let keySeed = 0
function nextKey(prefix: string) {
    keySeed += 1
    return `${prefix}-${keySeed}`
}

function makeEmptyOption() {
    return { key: nextKey('option'), text: '' }
}

type QuestionDraft = {
    key: string
    questionType: QuestionType
    questionText: string
    options: { key: string; text: string }[]
    correctIndex: number | null
    correctKeys: Set<string>
    correctTf: 'True' | 'False'
    referenceAnswer: string
}

function makeEmptyQuestionDraft(): QuestionDraft {
    return {
        key: nextKey('question'),
        questionType: 'multiple_choice_single',
        questionText: '',
        options: [makeEmptyOption(), makeEmptyOption()],
        correctIndex: null,
        correctKeys: new Set(),
        correctTf: 'True',
        referenceAnswer: '',
    }
}

// Validates one question draft, same rules addQuestion/
// createQuizWithFirstQuestion apply server-side. `label` is used to
// tell the teacher which card the error belongs to.
function validateDraft(draft: QuestionDraft, label: string): string | null {
    if (draft.questionText.trim().length < 2) {
        return `${label}: enter the question text.`
    }

    if (draft.questionType === 'multiple_choice_single') {
        const filledOptions = draft.options.map((o) => o.text.trim()).filter(Boolean)
        if (filledOptions.length < 2) {
            return `${label}: add at least two answer options.`
        }
        if (draft.correctIndex === null || !draft.options[draft.correctIndex]?.text.trim()) {
            return `${label}: click the bullet next to the correct answer.`
        }
    }

    if (draft.questionType === 'checklist') {
        const filledOptions = draft.options.map((o) => o.text.trim()).filter(Boolean)
        if (filledOptions.length < 2) {
            return `${label}: add at least two answer options.`
        }
        const anyCorrectFilled = draft.options.some((o) => draft.correctKeys.has(o.key) && o.text.trim())
        if (!anyCorrectFilled) {
            return `${label}: check the box next to at least one correct answer.`
        }
    }

    if (draft.questionType === 'short_answer' && !draft.referenceAnswer.trim()) {
        return `${label}: enter a reference answer for grading.`
    }

    return null
}

// Builds the plain-object shape createQuizWithQuestions expects for
// one question, ready to be JSON-encoded alongside the rest.
function serializeDraft(draft: QuestionDraft) {
    if (draft.questionType === 'true_false') {
        return {
            questionText: draft.questionText,
            questionType: draft.questionType,
            correctAnswer: draft.correctTf,
        }
    }
    if (draft.questionType === 'checklist') {
        const filledOptions = draft.options.map((o) => o.text.trim()).filter(Boolean)
        const correctTexts = draft.options
            .filter((o) => draft.correctKeys.has(o.key) && o.text.trim())
            .map((o) => o.text.trim())
        return {
            questionText: draft.questionText,
            questionType: draft.questionType,
            options: filledOptions.join(','),
            correctAnswer: correctTexts.join(','),
        }
    }
    if (draft.questionType === 'short_answer') {
        return {
            questionText: draft.questionText,
            questionType: draft.questionType,
            correctAnswer: draft.referenceAnswer.trim(),
        }
    }
    const filledOptions = draft.options.map((o) => o.text.trim()).filter(Boolean)
    const correctOption = draft.correctIndex !== null ? draft.options[draft.correctIndex] : undefined
    return {
        questionText: draft.questionText,
        questionType: draft.questionType,
        options: filledOptions.join(','),
        correctAnswer: correctOption?.text.trim() ?? '',
    }
}

export function NewQuizForm({ courseId }: { courseId: string }) {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [questions, setQuestions] = useState<QuestionDraft[]>([makeEmptyQuestionDraft()])
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)

    // Settings — same fields/shape as QuizSettingsForm.tsx, collected
    // here too since there's no separate settings step anymore: these
    // apply the moment the quiz is created, in the same submit as the
    // title and questions.
    const [timerEnabled, setTimerEnabled] = useState(false)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState('')
    const [maxAttempts, setMaxAttemptsValue] = useState(1)
    const [dueAt, setDueAt] = useState('')
    const [allowLate, setAllowLate] = useState(false)
    const [visibility, setVisibility] = useState<'submission' | 'grading' | 'never'>('submission')
    const [publishNow, setPublishNow] = useState(false)

    function updateQuestion(key: string, patch: Partial<QuestionDraft>) {
        setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)))
    }

    function addQuestionCard() {
        setQuestions((prev) => [...prev, makeEmptyQuestionDraft()])
    }

    function removeQuestionCard(key: string) {
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
                const nextCorrectKeys = new Set(q.correctKeys)
                nextCorrectKeys.delete(optionKey)
                return { ...q, options: nextOptions, correctIndex: nextCorrectIndex, correctKeys: nextCorrectKeys }
            })
        )
    }

    function toggleCorrectKey(questionKey: string, optionKey: string) {
        setQuestions((prev) =>
            prev.map((q) => {
                if (q.key !== questionKey) return q
                const next = new Set(q.correctKeys)
                if (next.has(optionKey)) next.delete(optionKey)
                else next.add(optionKey)
                return { ...q, correctKeys: next }
            })
        )
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (title.trim().length < 2) {
            setError('Give this quiz a name (at least 2 characters).')
            return
        }

        const parsedTimeLimit = timerEnabled ? parseInt(timeLimitMinutes, 10) : null
        if (timerEnabled && (Number.isNaN(parsedTimeLimit as number) || (parsedTimeLimit as number) < 1)) {
            setError('Time limit must be at least 1 minute.')
            return
        }

        if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
            setError('Max attempts must be at least 1.')
            return
        }

        for (const [i, draft] of questions.entries()) {
            const validationError = validateDraft(draft, `Question ${i + 1}`)
            if (validationError) {
                setError(validationError)
                return
            }
        }

        const formData = new FormData()
        formData.set('courseId', courseId)
        formData.set('title', title.trim())
        formData.set('questions', JSON.stringify(questions.map(serializeDraft)))
        if (parsedTimeLimit !== null) formData.set('timeLimitMinutes', String(parsedTimeLimit))
        formData.set('maxAttempts', String(maxAttempts))
        formData.set('resultsVisibility', visibility)
        if (dueAt) formData.set('availableUntil', new Date(dueAt).toISOString())
        formData.set('allowLate', String(allowLate))
        formData.set('publish', String(publishNow))

        setIsPending(true)
        const result = await createQuizWithQuestions(formData)
        setIsPending(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        // Same "posting is the done action" logic as
        // QuizSettingsForm.tsx: if they published immediately, send
        // them to the course page to see it live. Otherwise land on
        // the normal edit page to keep adding questions.
        if (publishNow) {
            router.push(`/teacher/courses/${courseId}`)
        } else {
            router.push(`/teacher/courses/${courseId}/quizzes/${result.quizId}/edit`)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6">
                <label htmlFor="newQuizTitle" className="text-label text-ink-soft block mb-2">
                    Quiz name <span className="text-error">(required)</span>
                </label>
                <input
                    id="newQuizTitle"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value)
                        if (error) setError('')
                    }}
                    placeholder="e.g. Chapter 3 Quiz"
                    aria-required="true"
                    className="w-full h-11 px-4 text-body-emphasis text-ink bg-surface rounded-md border-2 border-hairline focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
                />
            </div>

            <div className="space-y-4">
                {questions.map((draft, index) => (
                    <div
                        key={draft.key}
                        className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-6"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-body-emphasis text-ink">Question {index + 1}</h2>
                            <div className="flex items-center gap-2">
                                <select
                                    aria-label={`Question ${index + 1} type`}
                                    value={draft.questionType}
                                    onChange={(e) =>
                                        updateQuestion(draft.key, { questionType: e.target.value as QuestionType })
                                    }
                                    className="min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                                >
                                    <option value="multiple_choice_single">Multiple choice</option>
                                    <option value="true_false">True or false</option>
                                    <option value="checklist">Checklist (multiple answers)</option>
                                    <option value="short_answer">Short answer</option>
                                </select>
                                {questions.length > 1 && (
                                    <button
                                        type="button"
                                        aria-label={`Remove question ${index + 1}`}
                                        onClick={() => removeQuestionCard(draft.key)}
                                        className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-hairline text-text-secondary hover:border-error hover:text-error shrink-0"
                                    >
                                        <Trash2 size={18} aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <textarea
                            aria-label={`Question ${index + 1} text`}
                            rows={2}
                            required
                            value={draft.questionText}
                            onChange={(e) => updateQuestion(draft.key, { questionText: e.target.value })}
                            className="w-full px-5 py-3 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                            placeholder="Type the question here"
                        />

                        {draft.questionType === 'multiple_choice_single' && (
                            <div className="space-y-2">
                                <p className="text-caption text-text-secondary">Click the bullet to mark the correct answer</p>
                                {draft.options.map((option, optIndex) => (
                                    <div key={option.key} className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            aria-label={`Mark option ${optIndex + 1} as correct`}
                                            onClick={() => updateQuestion(draft.key, { correctIndex: optIndex })}
                                            className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${
                                                draft.correctIndex === optIndex
                                                    ? 'border-brand bg-brand text-on-ink'
                                                    : 'border-hairline hover:border-brand'
                                            }`}
                                        >
                                            {draft.correctIndex === optIndex && (
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
                                            onChange={(e) => updateOptionText(draft.key, option.key, e.target.value)}
                                            placeholder={`Option ${optIndex + 1}`}
                                            className="flex-1 min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                                        />
                                        {draft.options.length > 2 && (
                                            <button
                                                type="button"
                                                aria-label={`Remove option ${optIndex + 1}`}
                                                onClick={() => removeOptionRow(draft.key, option.key)}
                                                className="relative flex h-8 w-8 items-center justify-center rounded-md border-2 border-hairline text-text-secondary hover:border-error hover:text-error shrink-0 before:absolute before:-inset-1.5 before:content-['']"
                                            >
                                                <X size={14} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addOptionRow(draft.key)}
                                    className="text-caption font-semibold text-text-secondary hover:text-ink pl-8"
                                >
                                    + Add option
                                </button>
                            </div>
                        )}

                        {draft.questionType === 'checklist' && (
                            <div className="space-y-2">
                                <p className="text-caption text-text-secondary">Check the box next to every correct answer</p>
                                {draft.options.map((option, optIndex) => (
                                    <div key={option.key} className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            aria-label={`Mark option ${optIndex + 1} as correct`}
                                            checked={draft.correctKeys.has(option.key)}
                                            onChange={() => toggleCorrectKey(draft.key, option.key)}
                                            className="h-5 w-5 shrink-0 accent-brand"
                                        />
                                        <input
                                            type="text"
                                            value={option.text}
                                            onChange={(e) => updateOptionText(draft.key, option.key, e.target.value)}
                                            placeholder={`Option ${optIndex + 1}`}
                                            className="flex-1 min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                                        />
                                        {draft.options.length > 2 && (
                                            <button
                                                type="button"
                                                aria-label={`Remove option ${optIndex + 1}`}
                                                onClick={() => removeOptionRow(draft.key, option.key)}
                                                className="relative flex h-8 w-8 items-center justify-center rounded-md border-2 border-hairline text-text-secondary hover:border-error hover:text-error shrink-0 before:absolute before:-inset-1.5 before:content-['']"
                                            >
                                                <X size={14} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addOptionRow(draft.key)}
                                    className="text-caption font-semibold text-text-secondary hover:text-ink pl-8"
                                >
                                    + Add option
                                </button>
                            </div>
                        )}

                        {draft.questionType === 'true_false' && (
                            <div className="space-y-2">
                                <p className="text-caption text-text-secondary">Click the bullet to mark the correct answer</p>
                                {(['True', 'False'] as const).map((label) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            aria-label={`Mark ${label} as correct`}
                                            onClick={() => updateQuestion(draft.key, { correctTf: label })}
                                            className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${
                                                draft.correctTf === label
                                                    ? 'border-brand bg-brand text-on-ink'
                                                    : 'border-hairline hover:border-brand'
                                            }`}
                                        >
                                            {draft.correctTf === label && (
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

                        {draft.questionType === 'short_answer' && (
                            <div className="space-y-2">
                                <p className="text-caption text-text-secondary">
                                    This question is graded manually — enter a reference answer for your own use while grading.
                                    Students will see a text box instead of answer options.
                                </p>
                                <textarea
                                    aria-label={`Question ${index + 1} reference answer`}
                                    rows={2}
                                    value={draft.referenceAnswer}
                                    onChange={(e) => updateQuestion(draft.key, { referenceAnswer: e.target.value })}
                                    placeholder="e.g. Expected answer or grading notes"
                                    className="w-full px-5 py-3 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                                />
                            </div>
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addQuestionCard}
                    className="flex w-full h-14 items-center justify-center gap-2 rounded-md border-2 border-dashed border-hairline-strong text-body-md font-semibold text-ink-soft hover:border-brand hover:text-brand transition-colors"
                >
                    <Plus size={18} aria-hidden="true" />
                    Add another question
                </button>
            </div>

            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-5">
                <div>
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
                                    className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-2 border-hairline focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                                <span className="text-caption text-text-secondary">minutes</span>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label htmlFor="newQuizMaxAttempts" className="text-label text-ink-soft block mb-2">
                        Attempts allowed
                    </label>
                    <input
                        id="newQuizMaxAttempts"
                        type="number"
                        min={1}
                        value={maxAttempts}
                        onChange={(e) => setMaxAttemptsValue(Number(e.target.value))}
                        className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-2 border-hairline focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="newQuizDueAt" className="text-label text-ink-soft block mb-2">
                        Deadline (optional)
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                        <DateTimePicker id="newQuizDueAt" value={dueAt} onChange={setDueAt} placeholder="No deadline" />
                        <button
                            type="button"
                            onClick={() => setDueAt('')}
                            disabled={!dueAt}
                            className="text-caption font-medium text-text-secondary hover:text-error disabled:opacity-40"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                        <input
                            id="newQuizAllowLate"
                            type="checkbox"
                            checked={allowLate}
                            onChange={(e) => setAllowLate(e.target.checked)}
                            className="h-5 w-5 rounded border-2 border-hairline text-brand focus:ring-2 focus:ring-brand/30"
                        />
                        <label htmlFor="newQuizAllowLate" className="text-body-md text-ink">
                            Allow late starts and submissions
                        </label>
                    </div>
                </div>

                <div>
                    <label htmlFor="newQuizVisibility" className="text-label text-ink-soft block mb-2">
                        When can students see which answers were correct
                    </label>
                    <select
                        id="newQuizVisibility"
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as 'submission' | 'grading' | 'never')}
                        className="w-full min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                    >
                        <option value="submission">Right after submitting</option>
                        <option value="grading">Only after grading is complete</option>
                        <option value="never">Never — just show the score, no per-question detail</option>
                    </select>
                </div>

                <label className="flex items-center gap-2 text-body-md text-ink cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={publishNow}
                        onChange={(e) => setPublishNow(e.target.checked)}
                        className="h-4 w-4 accent-brand"
                    />
                    Post immediately — students can see it as soon as it&apos;s created
                </label>
            </div>

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
                {isPending ? 'Creating…' : publishNow ? 'Create & Post quiz' : 'Create quiz'}
            </button>
        </form>
    )
}
