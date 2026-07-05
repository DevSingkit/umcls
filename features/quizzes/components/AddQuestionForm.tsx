'use client'
// Form to add one question at a time, styled like Google Forms:
// options are individual rows you can add/remove, and you mark the
// correct one by clicking its bullet rather than retyping it below.

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addQuestion } from '@/features/quizzes/actions/create-quiz'

type QuestionType = 'multiple_choice_single' | 'true_false'

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
    const [correctTf, setCorrectTf] = useState<'True' | 'False'>('True')
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
            // Keep correctIndex pointing at the same option, or clear it if
            // the option that was marked correct just got removed.
            if (correctIndex !== null) {
                if (removedIndex === correctIndex) setCorrectIndex(null)
                else if (removedIndex < correctIndex) setCorrectIndex(correctIndex - 1)
            }
            return next
        })
    }

    function resetForm() {
        setQuestionText('')
        setOptions([makeEmptyOption(), makeEmptyOption()])
        setCorrectIndex(null)
        setCorrectTf('True')
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

        const formData = new FormData()
        formData.set('quizId', quizId)
        formData.set('questionText', questionText)
        formData.set('questionType', questionType)

        if (questionType === 'true_false') {
            formData.set('correctAnswer', correctTf)
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
        // Re-run the server component (QuizEditPage) so the new question
        // card appears above this form, without a full browser reload.
        router.refresh()
    }

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="bg-white rounded-hero shadow-card-lift p-8 space-y-6 border-l-4 border-hairline"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-body-emphasis text-ink">Add a question</h2>
                <select
                    aria-label="Question type"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className="h-10 px-4 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none text-caption-md"
                >
                    <option value="multiple_choice_single">Multiple choice</option>
                    <option value="true_false">True or false</option>
                </select>
            </div>

            <textarea
                aria-label="Question"
                rows={2}
                required
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full px-5 py-3 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none text-body-md"
                placeholder="Type the question here"
            />

            {questionType === 'multiple_choice_single' ? (
                <div className="space-y-2">
                    <p className="text-caption-sm text-graphite">Click the bullet to mark the correct answer</p>
                    {options.map((option, index) => (
                        <div key={option.key} className="flex items-center gap-3">
                            <button
                                type="button"
                                aria-label={`Mark option ${index + 1} as correct`}
                                onClick={() => setCorrectIndex(index)}
                                className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${correctIndex === index
                                        ? 'border-success bg-success text-white'
                                        : 'border-hairline hover:border-ink'
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
                                className="flex-1 h-11 px-4 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                            />
                            {options.length > 2 && (
                                <button
                                    type="button"
                                    aria-label={`Remove option ${index + 1}`}
                                    onClick={() => removeOptionRow(option.key)}
                                    className="text-graphite hover:text-error text-caption-md px-2"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addOptionRow}
                        className="text-caption-md text-graphite hover:text-ink pl-8"
                    >
                        + Add option
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-caption-sm text-graphite">Click the bullet to mark the correct answer</p>
                    {(['True', 'False'] as const).map((label) => (
                        <div key={label} className="flex items-center gap-3">
                            <button
                                type="button"
                                aria-label={`Mark ${label} as correct`}
                                onClick={() => setCorrectTf(label)}
                                className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${correctTf === label
                                        ? 'border-success bg-success text-white'
                                        : 'border-hairline hover:border-ink'
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

            {error && (
                <p className="text-caption-md text-error" role="alert">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 rounded-button bg-ink text-white font-medium disabled:opacity-60"
            >
                {isPending ? 'Adding…' : 'Add question'}
            </button>
        </form>
    )
}