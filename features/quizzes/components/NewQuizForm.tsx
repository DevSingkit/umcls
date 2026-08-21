'use client'
// features/quizzes/components/NewQuizForm.tsx
//
// Replaces the old flow where clicking "Create > Quiz" immediately
// inserted an empty quizzes row via createDraftQuiz, before the
// teacher had entered a title or any content — that empty row was a
// real draft as far as the database and getTeacherCourseStream were
// concerned, so it showed up in the course stream the instant the
// button was clicked. This form collects a title AND the first
// question together, client-side, and only calls the server (via
// createQuizWithFirstQuestion) once — nothing is written to the
// database until there's real content to write.
//
// The question-building UI (option rows, correct-answer marking, all
// four question types) is intentionally the same shape as
// AddQuestionForm.tsx, since that's the pattern teachers already know
// from adding question 2 onward — this just adds a title field above
// it and a different submit target.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuizWithFirstQuestion } from '@/features/quizzes/actions/create-quiz'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

type QuestionType = 'multiple_choice_single' | 'true_false' | 'checklist' | 'short_answer'

let optionKeySeed = 0
function nextOptionKey() {
    optionKeySeed += 1
    return `option-${optionKeySeed}`
}

function makeEmptyOption() {
    return { key: nextOptionKey(), text: '' }
}

export function NewQuizForm({ courseId }: { courseId: string }) {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice_single')
    const [questionText, setQuestionText] = useState('')
    const [options, setOptions] = useState([makeEmptyOption(), makeEmptyOption()])
    const [correctIndex, setCorrectIndex] = useState<number | null>(null)
    const [correctKeys, setCorrectKeys] = useState<Set<string>>(new Set())
    const [correctTf, setCorrectTf] = useState<'True' | 'False'>('True')
    const [referenceAnswer, setReferenceAnswer] = useState('')
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)

    // Settings — same fields/shape as QuizSettingsForm.tsx, collected
    // here too since there's no separate settings step anymore: these
    // apply the moment the quiz is created, in the same submit as the
    // title and first question.
    const [timerEnabled, setTimerEnabled] = useState(false)
    const [timeLimitMinutes, setTimeLimitMinutes] = useState('')
    const [maxAttempts, setMaxAttemptsValue] = useState(1)
    const [dueAt, setDueAt] = useState('')
    const [allowLate, setAllowLate] = useState(false)
    const [visibility, setVisibility] = useState<'submission' | 'grading' | 'never'>('submission')
    const [publishNow, setPublishNow] = useState(false)

    function updateOptionText(key: string, text: string) {
        setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, text } : o)))
    }

    function addOptionRow() {
        setOptions((prev) => [...prev, makeEmptyOption()])
    }

    function removeOptionRow(key: string) {
        setOptions((prev) => {
            const removedIndex = prev.findIndex((o) => o.key === key)
            const next = prev.filter((o) => o.key !== key)
            if (correctIndex !== null) {
                if (removedIndex === correctIndex) setCorrectIndex(null)
                else if (removedIndex < correctIndex) setCorrectIndex(correctIndex - 1)
            }
            setCorrectKeys((prev) => {
                const nextSet = new Set(prev)
                nextSet.delete(key)
                return nextSet
            })
            return next
        })
    }

    function toggleCorrectKey(key: string) {
        setCorrectKeys((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
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

        if (questionType === 'multiple_choice_single') {
            const filledOptions = options.map((o) => o.text.trim()).filter(Boolean)
            if (filledOptions.length < 2) {
                setError('Add at least two answer options.')
                return
            }
            if (correctIndex === null || !options[correctIndex]?.text.trim()) {
                setError('Click the bullet next to the correct answer.')
                return
            }
        }

        if (questionType === 'checklist') {
            const filledOptions = options.map((o) => o.text.trim()).filter(Boolean)
            if (filledOptions.length < 2) {
                setError('Add at least two answer options.')
                return
            }
            const anyCorrectFilled = options.some((o) => correctKeys.has(o.key) && o.text.trim())
            if (!anyCorrectFilled) {
                setError('Check the box next to at least one correct answer.')
                return
            }
        }

        if (questionType === 'short_answer' && !referenceAnswer.trim()) {
            setError('Enter a reference answer for grading.')
            return
        }

        const formData = new FormData()
        formData.set('courseId', courseId)
        formData.set('title', title.trim())
        formData.set('questionText', questionText)
        formData.set('questionType', questionType)
        if (parsedTimeLimit !== null) formData.set('timeLimitMinutes', String(parsedTimeLimit))
        formData.set('maxAttempts', String(maxAttempts))
        formData.set('resultsVisibility', visibility)
        if (dueAt) formData.set('availableUntil', new Date(dueAt).toISOString())
        formData.set('allowLate', String(allowLate))
        formData.set('publish', String(publishNow))

        if (questionType === 'true_false') {
            formData.set('correctAnswer', correctTf)
        } else if (questionType === 'checklist') {
            const filledOptions = options.map((o) => o.text.trim()).filter(Boolean)
            const correctTexts = options
                .filter((o) => correctKeys.has(o.key) && o.text.trim())
                .map((o) => o.text.trim())
            formData.set('options', filledOptions.join(','))
            formData.set('correctAnswer', correctTexts.join(','))
        } else if (questionType === 'short_answer') {
            formData.set('correctAnswer', referenceAnswer.trim())
        } else {
            const filledOptions = options.map((o) => o.text.trim()).filter(Boolean)
            const correctOption = correctIndex !== null ? options[correctIndex] : undefined
            formData.set('options', filledOptions.join(','))
            formData.set('correctAnswer', correctOption?.text.trim() ?? '')
        }

        setIsPending(true)
        const result = await createQuizWithFirstQuestion(formData)
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
        <form onSubmit={handleSubmit} className="space-y-5 bg-surface rounded-md border border-hairline shadow-card p-6">
            <div>
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
                    className="w-full h-11 px-4 text-body-emphasis text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
                />
            </div>

            <div>
                <label htmlFor="newQuizQuestionType" className="text-label text-ink-soft block mb-2">
                    Question type
                </label>
                <select
                    id="newQuizQuestionType"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className="w-full h-11 px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                >
                    <option value="multiple_choice_single">Multiple choice</option>
                    <option value="true_false">True / False</option>
                    <option value="checklist">Checklist (multiple correct)</option>
                    <option value="short_answer">Short answer</option>
                </select>
            </div>

            <textarea
                aria-label="Question"
                rows={2}
                required
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full px-5 py-3 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                placeholder="Type the question here"
            />

            {questionType === 'multiple_choice_single' && (
                <div className="space-y-2">
                    <p className="text-caption text-text-secondary">Click the bullet to mark the correct answer</p>
                    {options.map((option, index) => (
                        <div key={option.key} className="flex items-center gap-3">
                            <button
                                type="button"
                                aria-label={`Mark option ${index + 1} as correct`}
                                onClick={() => setCorrectIndex(index)}
                                className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${
                                    correctIndex === index
                                        ? 'border-brand bg-brand text-on-ink'
                                        : 'border-hairline-strong hover:border-brand'
                                }`}
                            >
                                {correctIndex === index && (
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
                                onChange={(e) => updateOptionText(option.key, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="flex-1 min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                            />
                            {options.length > 2 && (
                                <button
                                    type="button"
                                    aria-label={`Remove option ${index + 1}`}
                                    onClick={() => removeOptionRow(option.key)}
                                    className="text-text-secondary hover:text-error text-body-md px-2"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addOptionRow}
                        className="text-caption font-semibold text-text-secondary hover:text-ink pl-8"
                    >
                        + Add option
                    </button>
                </div>
            )}

            {questionType === 'checklist' && (
                <div className="space-y-2">
                    <p className="text-caption text-text-secondary">Check the box next to every correct answer</p>
                    {options.map((option, index) => (
                        <div key={option.key} className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                aria-label={`Mark option ${index + 1} as correct`}
                                checked={correctKeys.has(option.key)}
                                onChange={() => toggleCorrectKey(option.key)}
                                className="h-5 w-5 shrink-0 accent-brand"
                            />
                            <input
                                type="text"
                                value={option.text}
                                onChange={(e) => updateOptionText(option.key, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="flex-1 min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                            />
                            {options.length > 2 && (
                                <button
                                    type="button"
                                    aria-label={`Remove option ${index + 1}`}
                                    onClick={() => removeOptionRow(option.key)}
                                    className="text-text-secondary hover:text-error text-body-md px-2"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addOptionRow}
                        className="text-caption font-semibold text-text-secondary hover:text-ink pl-8"
                    >
                        + Add option
                    </button>
                </div>
            )}

            {questionType === 'true_false' && (
                <div className="space-y-2">
                    <p className="text-caption text-text-secondary">Click the bullet to mark the correct answer</p>
                    {(['True', 'False'] as const).map((label) => (
                        <div key={label} className="flex items-center gap-3">
                            <button
                                type="button"
                                aria-label={`Mark ${label} as correct`}
                                onClick={() => setCorrectTf(label)}
                                className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${
                                    correctTf === label
                                        ? 'border-brand bg-brand text-on-ink'
                                        : 'border-hairline-strong hover:border-brand'
                                }`}
                            >
                                {correctTf === label && (
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

            {questionType === 'short_answer' && (
                <div className="space-y-2">
                    <p className="text-caption text-text-secondary">
                        This question is graded manually — enter a reference answer for your own use while grading.
                        Students will see a text box instead of answer options.
                    </p>
                    <textarea
                        aria-label="Reference answer"
                        rows={2}
                        value={referenceAnswer}
                        onChange={(e) => setReferenceAnswer(e.target.value)}
                        placeholder="e.g. Expected answer or grading notes"
                        className="w-full px-5 py-3 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                    />
                </div>
            )}

            <div className="border-t border-hairline pt-5 space-y-5">
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
                                    className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
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
                        className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
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
                            className="h-5 w-5 rounded border-[1.5px] border-hairline-strong text-brand focus:ring-2 focus:ring-brand/30"
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
                        className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink"
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
