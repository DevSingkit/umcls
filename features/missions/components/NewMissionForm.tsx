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
//
// DESIGN-LMS 2.1 REDESIGN (2026-08-31): pure visual pass, no logic
// touched — every state variable and the full handleSubmit body below
// are byte-for-byte identical to before this pass. Changes:
//   1. Two bugs found while reading this file for the redesign, not
//      introduced by it, same classes fixed repeatedly elsewhere in
//      this track: the remove-option button used `hover:border-red
//      hover:text-red` (not real tokens — only `error`/`error-soft`
//      exist) and a raw ✕ unicode glyph instead of an SVG icon.
//      Corrected on sight: `border-red`/`text-red` → `border-error`/
//      `text-error`; ✕ → lucide-react's X icon.
//   2. Form controls stay Classroom Mode exactly as before — same
//      standing pattern established for AddActivityForm.tsx and
//      MissionSettingsForm.tsx: admin/CRUD controls stay clear and
//      structured, Mission Mode tactile styling is reserved for a
//      preview panel only.
//   3. One COMBINED preview panel added (not two separate ones) since
//      this form creates a mission's details AND its first activity
//      together in a single submit — matches MissionSettingsForm.tsx's
//      mission-details card (title/description/mastery-goal badge/
//      mock Start Mission button) stacked above AddActivityForm.tsx's
//      activity preview (Fredoka prompt + tactile option tiles with
//      the correct answer marked for the teacher's reference, hint
//      callout). Same non-interactive mock button and "preview only"
//      captions as those two files, for the same reason: this isn't a
//      real gameplay replica, it's a same-page check of both halves
//      of what's being created.
//   4. Preview only renders once EITHER half has real content (a
//      title or a prompt) — an entirely empty preview isn't useful and
//      the two sub-sections independently show/hide based on whether
//      their own half of the form has anything typed yet, so a
//      teacher who fills in the mission name first sees that section
//      appear before they've started on the activity, and vice versa.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Lightbulb, Eye, Play, Target } from 'lucide-react'
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

    const trimmedTitle = title.trim()
    const trimmedPrompt = prompt.trim()
    const showDetailsPreview = trimmedTitle.length > 0
    const showActivityPreview = trimmedPrompt.length > 0
    const showPreview = showDetailsPreview || showActivityPreview

    return (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            {/* ── Classroom Mode form controls — unchanged behavior ───────── */}
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
                                        className="flex h-8 w-8 items-center justify-center rounded-md border-[1.5px] border-hairline-strong text-text-secondary hover:border-error hover:text-error shrink-0"
                                    >
                                        <X size={16} aria-hidden="true" />
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

            {/* ── Mission Mode live preview — student-facing look only ───── */}
            <div className="lg:sticky lg:top-6">
                <div className="flex items-center gap-2 mb-3 text-text-secondary">
                    <Eye size={16} aria-hidden="true" />
                    <p className="text-caption font-semibold uppercase tracking-wide">
                        Student preview
                    </p>
                </div>

                {!showPreview ? (
                    <div className="rounded-2xl border-2 border-dashed border-hairline-strong p-8 text-center">
                        <p className="font-sans text-caption text-text-muted">
                            Start typing a mission name or activity prompt to see how this will
                            look to students.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Mission details half — mirrors MissionSettingsForm.tsx's preview */}
                        {showDetailsPreview && (
                            <div className="rounded-2xl bg-surface-sunken border-2 border-hairline p-6">
                                <p className="font-heading text-mission md:text-[1.75rem] text-ink">
                                    {trimmedTitle}
                                </p>
                                {description.trim() && (
                                    <p className="font-sans text-body-md text-ink-soft mt-2">
                                        {description.trim()}
                                    </p>
                                )}

                                <div className="mt-5 inline-flex items-center gap-2 rounded-pill bg-warning-soft text-warning px-4 py-2">
                                    <Target size={16} aria-hidden="true" />
                                    <span className="font-sans text-caption font-semibold">
                                        {masteryThreshold}-in-a-row to master
                                    </span>
                                </div>

                                <div
                                    aria-hidden="true"
                                    className="w-full h-14 mt-6 rounded-2xl border-b-4 bg-gamified-green border-gamified-green-dark flex items-center justify-center gap-2 text-white font-heading text-lg tracking-wide uppercase select-none"
                                >
                                    <Play size={20} fill="currentColor" aria-hidden="true" />
                                    Start Mission
                                </div>
                            </div>
                        )}

                        {/* First activity half — mirrors AddActivityForm.tsx's preview */}
                        {showActivityPreview && (
                            <div className="rounded-2xl bg-surface-sunken border-2 border-hairline p-6">
                                <p className="font-heading text-mission md:text-[1.75rem] text-ink mb-5">
                                    {trimmedPrompt}
                                </p>

                                {activityType === 'multiple_choice_single' && (
                                    <div className="space-y-3">
                                        {options
                                            .map((option, index) => ({ option, index }))
                                            .filter(({ option }) => option.text.trim().length > 0)
                                            .map(({ option, index }) => {
                                                const isCorrect = correctIndex === index
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
                                        {options.every((o) => !o.text.trim()) && (
                                            <p className="font-sans text-caption text-text-muted">
                                                Add answer options to preview them here.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {activityType === 'true_false' && (
                                    <div className="space-y-3">
                                        {(['True', 'False'] as const).map((label) => {
                                            const isCorrect = correctTf === label
                                            return (
                                                <div
                                                    key={label}
                                                    className={`w-full min-h-[60px] p-4 rounded-2xl border-2 border-b-4 flex items-center justify-between text-left ${
                                                        isCorrect
                                                            ? 'bg-success-soft border-success border-b-success'
                                                            : 'bg-surface border-hairline border-b-hairline-strong'
                                                    }`}
                                                >
                                                    <span className="font-sans font-bold text-base text-ink">
                                                        {label}
                                                    </span>
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

                                {hintText.trim() && (
                                    <div className="mt-5 flex items-start gap-2 rounded-md bg-warning-soft p-3">
                                        <Lightbulb size={16} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                                        <p className="font-sans text-caption text-ink-soft">{hintText.trim()}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="font-sans text-caption text-text-muted">
                            Preview only — the correct answer is marked here for your reference;
                            students never see it before they submit, and the Start Mission button
                            above isn&apos;t clickable here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
