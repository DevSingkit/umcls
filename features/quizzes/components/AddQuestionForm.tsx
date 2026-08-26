'use client'
// Form to add one question at a time, styled like Google Forms:
// options are individual rows you can add/remove, and you mark the
// correct one(s) by clicking its bullet/checkbox rather than retyping
// it below.

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addQuestion, resetQuizAttempts } from '@/features/quizzes/actions/create-quiz'

type QuestionType = 'multiple_choice_single' | 'true_false' | 'checklist' | 'short_answer'

let optionKeySeed = 0
function nextOptionKey() {
    optionKeySeed += 1
    return `option-${optionKeySeed}`
}

function makeEmptyOption() {
    return { key: nextOptionKey(), text: '' }
}

export function AddQuestionForm({ quizId }: { quizId: string }) {
    const router = useRouter()
    const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice_single')
    const [questionText, setQuestionText] = useState('')
    const [options, setOptions] = useState([makeEmptyOption(), makeEmptyOption()])
    const [correctIndex, setCorrectIndex] = useState<number | null>(null)
    const [correctKeys, setCorrectKeys] = useState<Set<string>>(new Set())
    const [correctTf, setCorrectTf] = useState<'True' | 'False'>('True')
    const [referenceAnswer, setReferenceAnswer] = useState('')
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

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

    function resetForm() {
        setQuestionText('')
        setOptions([makeEmptyOption(), makeEmptyOption()])
        setCorrectIndex(null)
        setCorrectKeys(new Set())
        setCorrectTf('True')
        setReferenceAnswer('')
        setQuestionType('multiple_choice_single')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

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
        formData.set('quizId', quizId)
        formData.set('questionText', questionText)
        formData.set('questionType', questionType)

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
        const result = await addQuestion(formData)
        setIsPending(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        resetForm()
        router.refresh()

        // This quiz was already live when the question was added — ask
        // whether students who already attempted it should get a clean
        // slate against the updated question set. See create-quiz.ts's
        // resetQuizAttempts (migration 062 RPC) for why this can't just
        // happen silently: it deletes real submitted/graded rows, so it
        // needs an explicit yes, same as any other button-danger-shaped
        // action in this app.
        if (result.quizPublished) {
            const shouldReset = window.confirm(
                "This quiz is already posted. Students who already took it will keep their old results unless you let them retake it with this new question. Reset everyone's attempts so they can retake it?"
            )
            if (shouldReset) {
                const resetResult = await resetQuizAttempts(quizId)
                if (!resetResult.ok) {
                    window.alert(resetResult.error)
                } else {
                    window.alert(
                        resetResult.attemptsCleared > 0
                            ? `Done — ${resetResult.attemptsCleared} attempt${resetResult.attemptsCleared === 1 ? '' : 's'} cleared. Students can retake the quiz now.`
                            : 'Done — no one had attempted this quiz yet.'
                    )
                }
            }
        }
    }

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-6 border-l-4 border-l-brand"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-body-emphasis text-ink">Add a question</h2>
                <select
                    aria-label="Question type"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className="min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink"
                >
                    <option value="multiple_choice_single">Multiple choice</option>
                    <option value="true_false">True or false</option>
                    <option value="checklist">Checklist (multiple answers)</option>
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
                                className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${correctIndex === index
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
                                    className="flex h-8 w-8 items-center justify-center rounded-md border-[1.5px] border-hairline-strong text-text-secondary hover:border-red hover:text-red shrink-0"
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
                                className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${correctTf === label
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
                {isPending ? 'Adding…' : 'Add question'}
            </button>
        </form>
    )
}
