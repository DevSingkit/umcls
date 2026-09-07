'use client'
// A single saved question, Google Forms-style. In view mode it's the
// original read-only display (question text + options via
// OptionBullet). Clicking Edit swaps in a form that mirrors
// AddQuestionForm's exact field patterns, pre-filled with this
// question's current data, so editing feels identical to creating one.
//
// GREEN BORDER REMOVED (2026-09-06): cosmetic-only pass, confirmed
// with user — both view mode and edit mode carried a border-l-4
// border-l-brand accent stripe, the same pattern that had been
// mirrored into missions' ActivityCard.tsx and was removed there for
// visual consistency with NewMissionForm.tsx. Removed here too, for
// the same reason. No logic touched.

import { useState } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { OptionBullet } from '@/features/quizzes/components/OptionBullet'
import { updateQuestion, deleteQuestion, resetQuizAttempts } from '@/features/quizzes/actions/create-quiz'

const QUESTION_TYPE_LABEL: Record<string, string> = {
    multiple_choice_single: 'Multiple choice',
    true_false: 'True / False',
    checklist: 'Checklist',
    short_answer: 'Short answer',
}

type QuestionType = 'multiple_choice_single' | 'true_false' | 'checklist' | 'short_answer'

type AnswerOption = {
    id: string
    option_text: string
    is_correct: boolean
}

type Question = {
    id: string
    question_text: string
    question_type: string
    explanation: string | null
    answer_options: AnswerOption[]
}

let optionKeySeed = 0
function nextOptionKey() {
    optionKeySeed += 1
    return `new-option-${optionKeySeed}`
}

function makeEmptyOption() {
    return { key: nextOptionKey(), text: '' }
}

export function QuestionCard({
    question,
    index,
    quizId,
}: {
    question: Question
    index: number
    // Needed only to call resetQuizAttempts after an edit/delete on an
    // already-posted quiz — see handleSave/handleDelete below. The
    // question row itself doesn't carry its parent quiz's id.
    quizId: string
}) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    // --- Edit-mode state, derived fresh from the question prop each
    // time Edit is clicked (see openEdit/resetToOriginal below), not
    // just on first mount, so this never goes stale if the parent
    // re-renders with updated data.
    const [questionType, setQuestionType] = useState<QuestionType>(question.question_type as QuestionType)
    const [questionText, setQuestionText] = useState(question.question_text)
    const [options, setOptions] = useState(() => buildInitialOptions(question))
    const [correctIndex, setCorrectIndex] = useState<number | null>(() => buildInitialCorrectIndex(question))
    const [correctKeys, setCorrectKeys] = useState<Set<string>>(() => buildInitialCorrectKeys(question))
    const [correctTf, setCorrectTf] = useState<'True' | 'False'>(() => buildInitialCorrectTf(question))
    const [referenceAnswer, setReferenceAnswer] = useState(question.explanation ?? '')

    function buildInitialOptions(q: Question) {
        if (q.question_type === 'true_false' || q.question_type === 'short_answer') {
            return [makeEmptyOption(), makeEmptyOption()]
        }
        if (q.answer_options.length === 0) {
            return [makeEmptyOption(), makeEmptyOption()]
        }
        return q.answer_options.map((o) => ({ key: o.id, text: o.option_text }))
    }

    function buildInitialCorrectIndex(q: Question): number | null {
        if (q.question_type !== 'multiple_choice_single') return null
        const idx = q.answer_options.findIndex((o) => o.is_correct)
        return idx >= 0 ? idx : null
    }

    function buildInitialCorrectKeys(q: Question): Set<string> {
        if (q.question_type !== 'checklist') return new Set()
        return new Set(q.answer_options.filter((o) => o.is_correct).map((o) => o.id))
    }

    function buildInitialCorrectTf(q: Question): 'True' | 'False' {
        if (q.question_type !== 'true_false') return 'True'
        const correct = q.answer_options.find((o) => o.is_correct)
        return (correct?.option_text as 'True' | 'False') ?? 'True'
    }

    function resetToOriginal() {
        setQuestionType(question.question_type as QuestionType)
        setQuestionText(question.question_text)
        setOptions(buildInitialOptions(question))
        setCorrectIndex(buildInitialCorrectIndex(question))
        setCorrectKeys(buildInitialCorrectKeys(question))
        setCorrectTf(buildInitialCorrectTf(question))
        setReferenceAnswer(question.explanation ?? '')
        setError('')
    }

    function openEdit() {
        resetToOriginal()
        setIsEditing(true)
    }

    function cancelEdit() {
        resetToOriginal()
        setIsEditing(false)
    }

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
            setCorrectKeys((prevKeys) => {
                const nextSet = new Set(prevKeys)
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

    // Shared by handleSave and handleDelete: this question's quiz was
    // already live when the change was made, so ask whether students
    // who already attempted it should get a clean slate against the
    // updated question set. resetQuizAttempts (migration 062 RPC)
    // deletes real submitted/graded rows, so it needs an explicit yes
    // rather than happening silently, same as any other
    // button-danger-shaped action in this app.
    async function maybeOfferAttemptReset(quizPublished: boolean, verb: 'edited' | 'deleted') {
        if (!quizPublished) return

        const shouldReset = window.confirm(
            `This quiz is already posted. Students who already took it will keep their old results unless you let them retake it now that a question was ${verb}. Reset everyone's attempts so they can retake it?`
        )
        if (!shouldReset) return

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

    async function handleSave(e: React.FormEvent) {
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
        formData.set('questionId', question.id)
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

        setIsSaving(true)
        const result = await updateQuestion(formData)
        setIsSaving(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        setIsEditing(false)
        router.refresh()
        await maybeOfferAttemptReset(result.quizPublished, 'edited')
    }

    async function handleDelete() {
        const confirmed = window.confirm('Delete this question? This cannot be undone.')
        if (!confirmed) return

        setIsDeleting(true)
        const result = await deleteQuestion(question.id)
        setIsDeleting(false)

        if (!result.ok) {
            window.alert(result.error)
            return
        }

        router.refresh()
        await maybeOfferAttemptReset(result.quizPublished, 'deleted')
    }

    if (!isEditing) {
        return (
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6">
                <div className="flex items-center justify-between mb-3 gap-3">
                    <p className="text-caption text-text-secondary">Question {index + 1}</p>
                    <div className="flex items-center gap-2">
                        <span className="text-caption font-semibold text-text-secondary bg-surface-sunken rounded-pill px-3 py-1">
                            {QUESTION_TYPE_LABEL[question.question_type] ?? question.question_type}
                        </span>
                        <button
                            type="button"
                            onClick={openEdit}
                            className="text-caption font-semibold text-brand hover:underline px-2 py-1"
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="text-caption font-semibold text-error hover:underline px-2 py-1 disabled:opacity-60"
                        >
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </button>
                    </div>
                </div>

                <p className="text-body-emphasis text-ink mb-4">{question.question_text}</p>

                {question.question_type === 'short_answer' ? (
                    <p className="text-caption text-text-secondary italic">
                        Reference answer: {question.explanation || '(none provided)'}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {question.answer_options.map((option) => (
                            <OptionBullet key={option.id} text={option.option_text} isCorrect={option.is_correct} />
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <form
            onSubmit={handleSave}
            className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-6"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-body-emphasis text-ink">Editing question {index + 1}</h2>
                <select
                    aria-label="Question type"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className="min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
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
                className="w-full px-5 py-3 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                placeholder="Type the question here"
            />

            {questionType === 'multiple_choice_single' && (
                <div className="space-y-2">
                    <p className="text-caption text-text-secondary">Click the bullet to mark the correct answer</p>
                    {options.map((option, optIndex) => (
                        <div key={option.key} className="flex items-center gap-3">
                            <button
                                type="button"
                                aria-label={`Mark option ${optIndex + 1} as correct`}
                                onClick={() => setCorrectIndex(optIndex)}
                                className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${correctIndex === optIndex
                                        ? 'border-brand bg-brand text-on-ink'
                                        : 'border-hairline hover:border-brand'
                                    }`}
                            >
                                {correctIndex === optIndex && (
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
                                placeholder={`Option ${optIndex + 1}`}
                                className="flex-1 min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                            />
                            {options.length > 2 && (
                                <button
                                    type="button"
                                    aria-label={`Remove option ${optIndex + 1}`}
                                    onClick={() => removeOptionRow(option.key)}
                                    className="text-text-secondary hover:text-error text-body-md px-2"
                                >
                                    <X size={14} aria-hidden="true" />
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
                    {options.map((option, optIndex) => (
                        <div key={option.key} className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                aria-label={`Mark option ${optIndex + 1} as correct`}
                                checked={correctKeys.has(option.key)}
                                onChange={() => toggleCorrectKey(option.key)}
                                className="h-5 w-5 shrink-0 accent-brand"
                            />
                            <input
                                type="text"
                                value={option.text}
                                onChange={(e) => updateOptionText(option.key, e.target.value)}
                                placeholder={`Option ${optIndex + 1}`}
                                className="flex-1 min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                            />
                            {options.length > 2 && (
                                <button
                                    type="button"
                                    aria-label={`Remove option ${optIndex + 1}`}
                                    onClick={() => removeOptionRow(option.key)}
                                    className="text-text-secondary hover:text-error text-body-md px-2"
                                >
                                    <X size={14} aria-hidden="true" />
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
                                        : 'border-hairline hover:border-brand'
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
                        className="w-full px-5 py-3 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                    />
                </div>
            )}

            {error && (
                <p className="text-caption text-error" role="alert">
                    {error}
                </p>
            )}

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 h-11 rounded-md bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md transition-colors disabled:opacity-60"
                >
                    {isSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={isSaving}
                    className="h-11 px-6 rounded-md border-2 border-hairline text-ink font-semibold text-body-md hover:bg-surface-sunken transition-colors disabled:opacity-60"
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}
