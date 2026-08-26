'use client'
// features/missions/components/ActivityCard.tsx
//
// A single saved activity, mirrors features/quizzes/components/
// QuestionCard.tsx exactly in structure: view mode is read-only
// (prompt + options), clicking Edit swaps in a form pre-filled with
// the activity's current data, mirroring AddActivityForm's field
// patterns.
//
// Differences from QuestionCard.tsx:
// - No checklist or short_answer types.
// - No resetQuizAttempts-equivalent step after save/delete. QuestionCard
//   calls resetQuizAttempts (a migration-062 RPC) when editing/deleting
//   on an already-posted quiz. There's no equivalent RPC yet for
//   mission_progress/attempt_events (service-role-only per HANDOFF.md's
//   Day-1 note) — deferred to Day 4, same as noted in
//   AddActivityForm.tsx and create-activity.ts. Save/delete here just
//   refresh the page.
// - Shows hint_text in view mode (questions have no hint field).
// - No OptionBullet.tsx equivalent was provided, so the correct/
//   incorrect option display below is a small inline reimplementation,
//   not a shared component — swap in a real ActivityOptionBullet if
//   one gets built to match OptionBullet's actual styling.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateActivity, deleteActivity } from '@/features/missions/actions/create-activity'

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
    multiple_choice_single: 'Multiple choice',
    true_false: 'True / False',
}

type ActivityType = 'multiple_choice_single' | 'true_false'

type ActivityOption = {
    id: string
    option_text: string
    is_correct: boolean
}

type Activity = {
    id: string
    prompt: string
    activity_type: string
    hint_text: string | null
    activity_options: ActivityOption[]
}

let optionKeySeed = 0
function nextOptionKey() {
    optionKeySeed += 1
    return `new-option-${optionKeySeed}`
}

function makeEmptyOption() {
    return { key: nextOptionKey(), text: '' }
}

// Small inline stand-in for the OptionBullet component QuestionCard.tsx
// uses — not provided, so this is a minimal reimplementation rather
// than a guess at its real styling.
function OptionRow({ text, isCorrect }: { text: string; isCorrect: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <span
                className={`flex items-center justify-center w-4 h-4 rounded-pill shrink-0 ${
                    isCorrect ? 'bg-brand text-on-ink' : 'border-[1.5px] border-hairline-strong'
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
}: {
    activity: Activity
    index: number
    missionId: string
}) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    const [activityType, setActivityType] = useState<ActivityType>(activity.activity_type as ActivityType)
    const [prompt, setPrompt] = useState(activity.prompt)
    const [options, setOptions] = useState(() => buildInitialOptions(activity))
    const [correctIndex, setCorrectIndex] = useState<number | null>(() => buildInitialCorrectIndex(activity))
    const [correctTf, setCorrectTf] = useState<'True' | 'False'>(() => buildInitialCorrectTf(activity))
    const [hintText, setHintText] = useState(activity.hint_text ?? '')

    function buildInitialOptions(a: Activity) {
        if (a.activity_type === 'true_false') {
            return [makeEmptyOption(), makeEmptyOption()]
        }
        if (a.activity_options.length === 0) {
            return [makeEmptyOption(), makeEmptyOption()]
        }
        return a.activity_options.map((o) => ({ key: o.id, text: o.option_text }))
    }

    function buildInitialCorrectIndex(a: Activity): number | null {
        if (a.activity_type !== 'multiple_choice_single') return null
        const idx = a.activity_options.findIndex((o) => o.is_correct)
        return idx >= 0 ? idx : null
    }

    function buildInitialCorrectTf(a: Activity): 'True' | 'False' {
        if (a.activity_type !== 'true_false') return 'True'
        const correct = a.activity_options.find((o) => o.is_correct)
        return (correct?.option_text as 'True' | 'False') ?? 'True'
    }

    function resetToOriginal() {
        setActivityType(activity.activity_type as ActivityType)
        setPrompt(activity.prompt)
        setOptions(buildInitialOptions(activity))
        setCorrectIndex(buildInitialCorrectIndex(activity))
        setCorrectTf(buildInitialCorrectTf(activity))
        setHintText(activity.hint_text ?? '')
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
            return next
        })
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (activityType === 'multiple_choice_single') {
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
        formData.set('activityId', activity.id)
        formData.set('prompt', prompt)
        formData.set('activityType', activityType)
        if (hintText.trim()) formData.set('hintText', hintText.trim())

        if (activityType === 'true_false') {
            formData.set('correctAnswer', correctTf)
        } else {
            const filledOptions = options.map((o) => o.text.trim()).filter(Boolean)
            const correctOption = correctIndex !== null ? options[correctIndex] : undefined
            formData.set('options', filledOptions.join(','))
            formData.set('correctAnswer', correctOption?.text.trim() ?? '')
        }

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
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 border-l-4 border-l-brand">
                <div className="flex items-center justify-between mb-3 gap-3">
                    <p className="text-caption text-text-secondary">Activity {index + 1}</p>
                    <div className="flex items-center gap-2">
                        <span className="text-caption font-semibold text-text-secondary bg-surface-sunken rounded-pill px-3 py-1">
                            {ACTIVITY_TYPE_LABEL[activity.activity_type] ?? activity.activity_type}
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

                <p className="text-body-emphasis text-ink mb-4">{activity.prompt}</p>

                <div className="space-y-2">
                    {activity.activity_options.map((option) => (
                        <OptionRow key={option.id} text={option.option_text} isCorrect={option.is_correct} />
                    ))}
                </div>

                {activity.hint_text && (
                    <p className="text-caption text-text-secondary italic mt-4">Hint: {activity.hint_text}</p>
                )}
            </div>
        )
    }

    return (
        <form
            onSubmit={handleSave}
            className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-6 border-l-4 border-l-brand"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-body-emphasis text-ink">Editing activity {index + 1}</h2>
                <select
                    aria-label="Activity type"
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as ActivityType)}
                    className="min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink"
                >
                    <option value="multiple_choice_single">Multiple choice</option>
                    <option value="true_false">True or false</option>
                </select>
            </div>

            <textarea
                aria-label="Activity prompt"
                rows={2}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-5 py-3 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                placeholder="Type the activity prompt here"
            />

            {activityType === 'multiple_choice_single' && (
                <div className="space-y-2">
                    <p className="text-caption text-text-secondary">Click the bullet to mark the correct answer</p>
                    {options.map((option, optIndex) => (
                        <div key={option.key} className="flex items-center gap-3">
                            <button
                                type="button"
                                aria-label={`Mark option ${optIndex + 1} as correct`}
                                onClick={() => setCorrectIndex(optIndex)}
                                className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${
                                    correctIndex === optIndex
                                        ? 'border-brand bg-brand text-on-ink'
                                        : 'border-hairline-strong hover:border-brand'
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
                                className="flex-1 min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                            />
                            {options.length > 2 && (
                                <button
                                    type="button"
                                    aria-label={`Remove option ${optIndex + 1}`}
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

            {activityType === 'true_false' && (
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

            <div>
                <label htmlFor={`editActivityHint-${activity.id}`} className="text-label text-ink-soft block mb-2">
                    Hint (optional — shown after 2 wrong attempts)
                </label>
                <textarea
                    id={`editActivityHint-${activity.id}`}
                    rows={2}
                    value={hintText}
                    onChange={(e) => setHintText(e.target.value)}
                    className="w-full px-5 py-3 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                />
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
                    className="h-11 px-6 rounded-md border-[1.5px] border-hairline-strong text-ink font-semibold text-body-md hover:bg-surface-sunken transition-colors disabled:opacity-60"
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}
