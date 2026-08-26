'use client'
// features/missions/components/NewMissionForm.tsx
//
// Mirrors features/quizzes/components/NewQuizForm.tsx: collects a
// title AND the first activity together, client-side, and only calls
// the server (via createMissionWithFirstActivity) once — nothing is
// written to the database until there's real content to write. Same
// "never write an empty draft" principle as NewQuizForm.tsx.
//
// Differences from NewQuizForm.tsx:
// - No checklist or short_answer question types — see
//   create-mission.ts's header for why short_answer is excluded.
// - Settings are mission-shaped, not quiz-shaped: mastery_threshold
//   and an optional description, instead of timer/max-attempts/
//   deadline/results-visibility (missions have no equivalent columns
//   for any of those).
// - Adds a hint field, since activities (unlike questions) have
//   hint_text.
//
// The activity-building UI below (option rows, correct-answer marking)
// is intentionally the same shape as AddActivityForm.tsx, same reason
// NewQuizForm.tsx matches AddQuestionForm.tsx — it's the pattern
// teachers already know from adding activity 2 onward.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMissionWithFirstActivity } from '@/features/missions/actions/create-mission'

type ActivityType = 'multiple_choice_single' | 'true_false'

let optionKeySeed = 0
function nextOptionKey() {
    optionKeySeed += 1
    return `option-${optionKeySeed}`
}

function makeEmptyOption() {
    return { key: nextOptionKey(), text: '' }
}

export function NewMissionForm({ courseId, lessonId }: { courseId: string; lessonId: string }) {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [activityType, setActivityType] = useState<ActivityType>('multiple_choice_single')
    const [prompt, setPrompt] = useState('')
    const [options, setOptions] = useState([makeEmptyOption(), makeEmptyOption()])
    const [correctIndex, setCorrectIndex] = useState<number | null>(null)
    const [correctTf, setCorrectTf] = useState<'True' | 'False'>('True')
    const [hintText, setHintText] = useState('')
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)

    // Settings — mission-shaped, collected here same as NewQuizForm.tsx
    // collects quiz settings up front: applies the moment the mission
    // is created, in the same submit as the title and first activity.
    const [masteryThreshold, setMasteryThreshold] = useState(3)
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
            return next
        })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (title.trim().length < 2) {
            setError('Give this mission a name (at least 2 characters).')
            return
        }

        if (!Number.isInteger(masteryThreshold) || masteryThreshold < 1) {
            setError('Mastery threshold must be at least 1.')
            return
        }

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
        formData.set('lessonId', lessonId)
        formData.set('title', title.trim())
        if (description.trim()) formData.set('description', description.trim())
        formData.set('masteryThreshold', String(masteryThreshold))
        formData.set('prompt', prompt)
        formData.set('activityType', activityType)
        if (hintText.trim()) formData.set('hintText', hintText.trim())
        formData.set('publish', String(publishNow))

        if (activityType === 'true_false') {
            formData.set('correctAnswer', correctTf)
        } else {
            const filledOptions = options.map((o) => o.text.trim()).filter(Boolean)
            const correctOption = correctIndex !== null ? options[correctIndex] : undefined
            formData.set('options', filledOptions.join(','))
            formData.set('correctAnswer', correctOption?.text.trim() ?? '')
        }

        setIsPending(true)
        const result = await createMissionWithFirstActivity(formData)
        setIsPending(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        // Same "posting is the done action" logic as
        // saveQuizSettingsAndPublish/NewQuizForm.tsx: if published
        // immediately, go see it live; otherwise land on the edit page
        // to keep adding activities.
        if (publishNow) {
            router.push(`/teacher/courses/${courseId}/lessons/${lessonId}`)
        } else {
            router.push(`/teacher/courses/${courseId}/lessons/${lessonId}/missions/${result.missionId}/edit`)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 bg-surface rounded-md border border-hairline shadow-card p-6">
            <div>
                <label htmlFor="newMissionTitle" className="text-label text-ink-soft block mb-2">
                    Mission name <span className="text-error">(required)</span>
                </label>
                <input
                    id="newMissionTitle"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value)
                        if (error) setError('')
                    }}
                    placeholder="e.g. Fractions: Adding & Subtracting"
                    aria-required="true"
                    className="w-full h-11 px-4 text-body-emphasis text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
                />
            </div>

            <div>
                <label htmlFor="newMissionDescription" className="text-label text-ink-soft block mb-2">
                    Description (optional)
                </label>
                <textarea
                    id="newMissionDescription"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What will students practice in this mission?"
                    className="w-full px-5 py-3 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                />
            </div>

            <div>
                <label htmlFor="newMissionActivityType" className="text-label text-ink-soft block mb-2">
                    Activity type
                </label>
                <select
                    id="newMissionActivityType"
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as ActivityType)}
                    className="w-full h-11 px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                >
                    <option value="multiple_choice_single">Multiple choice</option>
                    <option value="true_false">True / False</option>
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
                <label htmlFor="newMissionHint" className="text-label text-ink-soft block mb-2">
                    Hint (optional — shown after 2 wrong attempts)
                </label>
                <textarea
                    id="newMissionHint"
                    rows={2}
                    value={hintText}
                    onChange={(e) => setHintText(e.target.value)}
                    placeholder="A nudge in the right direction, not the answer itself"
                    className="w-full px-5 py-3 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                />
            </div>

            <div className="border-t border-hairline pt-5 space-y-5">
                <div>
                    <label htmlFor="newMissionMasteryThreshold" className="text-label text-ink-soft block mb-2">
                        Correct in a row to master this mission
                    </label>
                    <input
                        id="newMissionMasteryThreshold"
                        type="number"
                        min={1}
                        value={masteryThreshold}
                        onChange={(e) => setMasteryThreshold(Number(e.target.value))}
                        className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
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
                {isPending ? 'Creating…' : publishNow ? 'Create & Post mission' : 'Create mission'}
            </button>
        </form>
    )
}
