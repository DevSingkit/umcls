'use client'
// features/missions/components/ActivityCard.tsx
//
// MIGRATION 094 REWRITE (2026-09-01): activity.prompt/activity_type/
// activity_options no longer exist on the shape getMissionForTeacher
// returns — an activity is now `{ id, order_index,
// remediates_activity_id, questions: [{ id, prompt, question_type,
// hint_text, options: [...] }] }`. This card's view mode now lists
// every question in the activity (not a single prompt+options pair),
// and its edit mode is the same multi-question editor as
// AddActivityForm.tsx, pre-filled from activity.questions and saved
// via the same `questions` JSON array updateActivity already expects.
// This was a genuine functional gap, not a style pass — the previous
// version could not save against the current schema at all.
//
// Differences from AddActivityForm.tsx's editor (kept from the
// original comment, still true):
// - No checklist or short_answer types.
// - No resetQuizAttempts-equivalent step after save/delete — deferred
//   to Day 4, same as before.
// - No OptionBullet.tsx equivalent was provided, so the correct/
//   incorrect option display below is a small inline reimplementation.

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateActivity, deleteActivity } from '@/features/missions/actions/create-activity'

const QUESTION_TYPE_LABEL: Record<string, string> = {
    multiple_choice_single: 'Multiple choice',
    true_false: 'True / False',
}

type QuestionType = 'multiple_choice_single' | 'true_false'

type QuestionOption = {
    id: string
    option_text: string
    is_correct: boolean
}

type Question = {
    id: string
    prompt: string
    question_type: string
    hint_text: string | null
    options: QuestionOption[]
}

type Activity = {
    id: string
    order_index: number
    remediates_activity_id: string | null
    questions: Question[]
}

let keySeed = 0
function nextKey(prefix: string) {
    keySeed += 1
    return `${prefix}-${keySeed}`
}

function makeEmptyOption() {
    return { key: nextKey('option'), text: '' }
}

function buildDraftFromQuestion(q: Question) {
    const questionType = q.question_type as QuestionType
    const sortedOptions = q.options
    const correctOption = sortedOptions.find((o) => o.is_correct)
    return {
        key: nextKey('question'),
        questionType,
        prompt: q.prompt,
        options:
            questionType === 'true_false' || sortedOptions.length === 0
                ? [makeEmptyOption(), makeEmptyOption()]
                : sortedOptions.map((o) => ({ key: o.id, text: o.option_text })),
        correctIndex:
            questionType === 'multiple_choice_single'
                ? (() => {
                      const idx = sortedOptions.findIndex((o) => o.is_correct)
                      return idx >= 0 ? idx : null
                  })()
                : null,
        correctTf: (questionType === 'true_false' && correctOption?.option_text === 'False' ? 'False' : 'True') as
            | 'True'
            | 'False',
        hintText: q.hint_text ?? '',
    }
}

type QuestionDraft = ReturnType<typeof buildDraftFromQuestion>

// Small inline stand-in for the OptionBullet component — not provided,
// so this is a minimal reimplementation rather than a guess at its
// real styling.
function OptionRow({ text, isCorrect }: { text: string; isCorrect: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <span
                className={`flex items-center justify-center w-4 h-4 rounded-pill shrink-0 ${
                    isCorrect ? 'bg-brand text-on-ink' : 'border-2 border-hairline'
                }`}
            >
                {isCorrect && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                        <path
                            fillRule="evenodd"
                            d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                )}
            </span>
            <span className={`text-body-md ${isCorrect ? 'text-ink font-medium' : 'text-ink-soft'}`}>{text}</span>
        </div>
    )
}

export function ActivityCard({
    activity,
    index,
    missionId,
    allActivities,
}: {
    activity: Activity
    index: number
    missionId: string
    // Every activity in this mission, including this one — used to
    // build the remediation picker's sibling list (self excluded) and
    // to resolve activity.remediates_activity_id into a readable
    // prompt (its first question's) for the view-mode display below.
    allActivities: Activity[]
}) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    const [questions, setQuestions] = useState<QuestionDraft[]>(() =>
        activity.questions.map(buildDraftFromQuestion)
    )
    const [remediatesActivityId, setRemediatesActivityId] = useState(activity.remediates_activity_id ?? '')

    const siblingActivities = allActivities.filter((a) => a.id !== activity.id)
    const remediationTarget = activity.remediates_activity_id
        ? allActivities.find((a) => a.id === activity.remediates_activity_id)
        : null
    // Sibling/remediation-target activities are identified by their
    // first question's prompt — an activity has no prompt of its own
    // anymore, and every activity here has at least one question
    // (addActivity/updateActivity both enforce that).
    const labelForActivity = (a: Activity) => a.questions[0]?.prompt ?? '(no questions)'

    function resetToOriginal() {
        setQuestions(activity.questions.map(buildDraftFromQuestion))
        setRemediatesActivityId(activity.remediates_activity_id ?? '')
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

    function updateQuestion(key: string, patch: Partial<QuestionDraft>) {
        setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)))
    }

    function addQuestionBlock() {
        setQuestions((prev) => [
            ...prev,
            {
                key: nextKey('question'),
                questionType: 'multiple_choice_single' as QuestionType,
                prompt: '',
                options: [makeEmptyOption(), makeEmptyOption()],
                correctIndex: null,
                correctTf: 'True' as const,
                hintText: '',
            },
        ])
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

    async function handleSave(e: React.FormEvent) {
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
        formData.set('activityId', activity.id)
        formData.set('questions', JSON.stringify(questionsPayload))
        formData.set('remediatesActivityId', remediatesActivityId)

        setIsSaving(true)
        const result = await updateActivity(formData)
        setIsSaving(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        setIsEditing(false)
        router.refresh()
    }

    async function handleDelete() {
        const confirmed = window.confirm('Delete this activity? This cannot be undone.')
        if (!confirmed) return

        setIsDeleting(true)
        const result = await deleteActivity(activity.id)
        setIsDeleting(false)

        if (!result.ok) {
            window.alert(result.error)
            return
        }

        router.refresh()
    }

    if (!isEditing) {
        return (
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 border-l-4 border-l-brand space-y-5">
                <div className="flex items-center justify-between mb-1 gap-3">
                    <p className="text-caption text-text-secondary">
                        Activity {index + 1} · {activity.questions.length} question
                        {activity.questions.length === 1 ? '' : 's'}
                    </p>
                    <div className="flex items-center gap-2">
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

                {activity.questions.map((q, qIndex) => (
                    <div key={q.id} className={qIndex > 0 ? 'pt-4 border-t border-hairline' : ''}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-caption font-semibold text-text-secondary bg-surface-sunken rounded-pill px-3 py-1">
                                {QUESTION_TYPE_LABEL[q.question_type] ?? q.question_type}
                            </span>
                        </div>
                        <p className="text-body-emphasis text-ink mb-3">{q.prompt}</p>
                        <div className="space-y-2">
                            {q.options.map((option) => (
                                <OptionRow key={option.id} text={option.option_text} isCorrect={option.is_correct} />
                            ))}
                        </div>
                        {q.hint_text && (
                            <p className="text-caption text-text-secondary italic mt-3">Hint: {q.hint_text}</p>
                        )}
                    </div>
                ))}

                {remediationTarget && (
                    <p className="text-caption text-info pt-3 border-t border-hairline">
                        After repeated wrong answers, remediates to: &ldquo;
                        {labelForActivity(remediationTarget).length > 60
                            ? `${labelForActivity(remediationTarget).slice(0, 60)}…`
                            : labelForActivity(remediationTarget)}
                        &rdquo;
                    </p>
                )}
            </div>
        )
    }

    return (
        <form
            onSubmit={handleSave}
            className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-6 border-l-4 border-l-brand"
        >
            <h2 className="text-body-emphasis text-ink">Editing activity {index + 1}</h2>

            {questions.map((q, qIndex) => (
                <div key={q.key} className="space-y-4 rounded-md border border-hairline p-4">
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

                    <select
                        aria-label={`Question ${qIndex + 1} type`}
                        value={q.questionType}
                        onChange={(e) => updateQuestion(q.key, { questionType: e.target.value as QuestionType })}
                        className="min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                    >
                        <option value="multiple_choice_single">Multiple choice</option>
                        <option value="true_false">True or false</option>
                    </select>

                    <textarea
                        aria-label={`Question ${qIndex + 1} prompt`}
                        rows={2}
                        required
                        value={q.prompt}
                        onChange={(e) => updateQuestion(q.key, { prompt: e.target.value })}
                        className="w-full px-5 py-3 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
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
                                        className="flex-1 min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                                    />
                                    {q.options.length > 2 && (
                                        <button
                                            type="button"
                                            aria-label={`Remove option ${optIndex + 1}`}
                                            onClick={() => removeOptionRow(q.key, option.key)}
                                            className="text-text-secondary hover:text-error text-body-md px-2"
                                        >
                                            <X size={14} aria-hidden="true" />
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
                        <label htmlFor={`editHint-${q.key}`} className="text-label text-ink-soft block mb-2">
                            Hint (optional — shown after 2 wrong attempts)
                        </label>
                        <textarea
                            id={`editHint-${q.key}`}
                            rows={2}
                            value={q.hintText}
                            onChange={(e) => updateQuestion(q.key, { hintText: e.target.value })}
                            className="w-full px-5 py-3 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
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

            <div>
                <label htmlFor={`editActivityRemediation-${activity.id}`} className="text-label text-ink-soft block mb-2">
                    Remediation (optional — shown after repeated wrong answers)
                </label>
                {siblingActivities.length === 0 ? (
                    <p className="text-caption text-text-secondary">
                        Add another activity to this mission before setting one up as a remediation.
                    </p>
                ) : (
                    <select
                        id={`editActivityRemediation-${activity.id}`}
                        value={remediatesActivityId}
                        onChange={(e) => setRemediatesActivityId(e.target.value)}
                        className="w-full min-h-[44px] px-4 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                    >
                        <option value="">None</option>
                        {siblingActivities.map((sibling) => (
                            <option key={sibling.id} value={sibling.id}>
                                {labelForActivity(sibling).length > 70
                                    ? `${labelForActivity(sibling).slice(0, 70)}…`
                                    : labelForActivity(sibling)}
                            </option>
                        ))}
                    </select>
                )}
            </div>

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
