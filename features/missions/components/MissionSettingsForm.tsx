'use client'
// features/missions/components/MissionSettingsForm.tsx
//
// Mirrors features/quizzes/components/QuizSettingsForm.tsx's post-2026-
// 08-19 shape: one button only, publish is one-way.
//   - Still a draft: "Save & Post" — saves settings and publishes.
//   - Already posted: "Update" — saves settings only, publish state
//     never touched again once true.
// Settings only ever apply when this button is clicked — no
// auto-save on blur/change, same as QuizSettingsForm.tsx.
//
// Deviation from QuizSettingsForm.tsx, called out explicitly: quizzes
// keep title editing separate (via updateQuizTitle, presumably wired
// up through QuizTitleField.tsx, which wasn't provided). This form
// folds title + description into the same save as mastery threshold
// and publish, via updateMissionSettings, rather than inventing a
// second inline-editable-title component blind. If a QuizTitleField.tsx
// equivalent is wanted later for missions, title can be split back out.
//
// Fields present here are mission-shaped only: title, description,
// mastery threshold, publish. No timer/max-attempts/deadline/results-
// visibility — missions have no equivalent columns for any of those.

// GAP #2 FIX (2026-08-30, continued conversation): added a "Reset
// student progress" control, shown only once the mission is posted
// (a draft has no students able to have progress on it yet). Two-step
// confirm, same pattern as StreamItemMenu.tsx's delete confirm —
// this is a genuinely destructive, irreversible action (wipes
// mission_progress/attempt_events/activity_mastery for every student
// on this mission), so it doesn't fire on a single click.
//
// CONSISTENCY FIX (2026-09-02): the earlier DESIGN-LMS 2.1 pass added a
// two-column layout (form + a separate "Student Preview" panel with a
// mock tactile card). NewMissionForm.tsx was later rebuilt to drop that
// pattern entirely — mobile-first single column, no preview panel at
// all, per explicit user direction. This page (the edit-mission
// settings section) never got that same rebuild, leaving it visibly
// inconsistent with the create page (confirmed via screenshots: this
// form still showed the "Student Preview" side panel while
// NewMissionForm.tsx did not). Brought in line here: the preview panel
// and its lg:grid-cols-2 wrapper are removed; the form is now a single
// centered column with the same max-w-md/max-w-lg breathing room
// NewMissionForm.tsx uses, on both mobile and desktop.
//
// No logic touched by this pass — every state variable, the full
// validation chain inside handleSave, and handleResetProgress are
// byte-for-byte identical to before. Only the outer wrapper markup and
// the removed preview block changed. The bug fix from the earlier pass
// (text-red/border-red/etc. → text-error/border-error/etc.) stays as
// already corrected.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMissionSettings, resetMissionProgress } from '@/features/missions/actions/create-mission'

export function MissionSettingsForm({
    missionId,
    courseId,
    lessonId,
    currentTitle,
    currentDescription,
    currentMasteryThreshold,
    // NEW (migration 099). Optional with a `true` fallback so this
    // form doesn't break if the page rendering it hasn't been updated
    // to pass this through yet — but until it is, this form will
    // always show/save "on" regardless of what's actually saved in
    // the DB. The edit page needs `getMissionForTeacher`'s
    // `mission.reveal_correct_answer` threaded into this prop for the
    // toggle to reflect real saved state.
    currentRevealCorrectAnswer = true,
    // NEW (migration 100). Same optional-with-safe-fallback pattern as
    // currentRevealCorrectAnswer — but defaults to false here to match
    // the column's own DB default (no shuffle) rather than true.
    currentShuffleOptions = false,
    totalActivities,
    isPublished,
}: {
    missionId: string
    courseId: string
    lessonId: string
    currentTitle: string
    currentDescription: string | null
    currentMasteryThreshold: number
    currentRevealCorrectAnswer?: boolean
    currentShuffleOptions?: boolean
    totalActivities: number
    isPublished: boolean
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [saved, setSaved] = useState(false)
    const [errors, setErrors] = useState<string[]>([])
    const [published, setPublished] = useState(isPublished)

    const [title, setTitle] = useState(currentTitle)
    const [description, setDescription] = useState(currentDescription ?? '')
    const [masteryThreshold, setMasteryThreshold] = useState(currentMasteryThreshold)
    const [revealCorrectAnswer, setRevealCorrectAnswer] = useState(currentRevealCorrectAnswer)
    const [shuffleOptions, setShuffleOptions] = useState(currentShuffleOptions)

    const [isResetConfirming, setIsResetConfirming] = useState(false)
    const [isResetting, startResetting] = useTransition()
    const [resetError, setResetError] = useState('')
    const [resetResult, setResetResult] = useState<number | null>(null)

    function handleResetProgress() {
        setResetError('')
        startResetting(async () => {
            const result = await resetMissionProgress(missionId)
            if (!result.ok) {
                setResetError(result.error)
                return
            }
            setResetResult(result.affectedStudents)
            setIsResetConfirming(false)
            router.refresh()
        })
    }

    const hasActivities = totalActivities > 0

    // Same "one function handles both cases" shape as
    // QuizSettingsForm.tsx's handleSave: saving settings on an
    // already-posted mission, and saving-plus-posting a still-draft
    // one. Only the post-save behavior (redirect vs. stay + refresh)
    // and the "must have an activity first" guard differ.
    function handleSave() {
        setSaved(false)
        setErrors([])

        if (title.trim().length < 2) {
            setErrors(['Give this mission a name (at least 2 characters).'])
            return
        }

        if (!Number.isInteger(masteryThreshold) || masteryThreshold < 1) {
            setErrors(['Mastery threshold must be at least 1.'])
            return
        }

        if (!published && !hasActivities) {
            setErrors(['Add at least one activity before posting.'])
            return
        }

        const formData = new FormData()
        formData.set('missionId', missionId)
        formData.set('title', title.trim())
        if (description.trim()) formData.set('description', description.trim())
        formData.set('masteryThreshold', String(masteryThreshold))
        formData.set('revealCorrectAnswer', String(revealCorrectAnswer))
        formData.set('shuffleOptions', String(shuffleOptions))
        // Publish is monotonic from this form, same as
        // QuizSettingsForm.tsx — once posted, this always sends true
        // again; there's no path here that ever sends false.
        formData.set('publish', 'true')

        const wasAlreadyPublished = published

        startTransition(async () => {
            const result = await updateMissionSettings(formData)

            if (!result.ok) {
                setErrors([result.error])
                return
            }

            setPublished(true)
            setSaved(true)

            if (wasAlreadyPublished) {
                router.refresh()
            } else {
                router.push(`/teacher/courses/${courseId}/lessons/${lessonId}`)
            }
        })
    }

    return (
        <div className="mx-auto w-full max-w-md space-y-6 sm:max-w-lg mb-8">
            <div className="clay-card p-5 sm:p-6 space-y-8">
                <div>
                    <label htmlFor="missionSettingsTitle" className="text-label text-ink-soft block mb-2">
                        Mission name <span className="text-error">(required)</span>
                    </label>
                    <input
                        id="missionSettingsTitle"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="clay-well w-full min-h-touch px-4 text-body-emphasis text-ink rounded-2xl border-2 border-hairline focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div className="border-t border-hairline pt-6">
                    <label htmlFor="missionSettingsDescription" className="text-label text-ink-soft block mb-2">
                        Description (optional)
                    </label>
                    <textarea
                        id="missionSettingsDescription"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="clay-well w-full px-5 py-3 rounded-2xl border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div className="border-t border-hairline pt-6">
                    <label htmlFor="missionSettingsMasteryThreshold" className="text-label text-ink-soft block mb-2">
                        Correct in a row to master this mission
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            id="missionSettingsMasteryThreshold"
                            type="number"
                            min={1}
                            value={masteryThreshold}
                            onChange={(e) => setMasteryThreshold(Number(e.target.value))}
                            className="clay-well w-24 min-h-touch px-4 text-body-md text-ink rounded-2xl border-2 border-hairline focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                        <span className="text-body-md text-text-secondary">
                            A student unlocks the next mission after {masteryThreshold} correct answer
                            {masteryThreshold === 1 ? '' : 's'} in a row on this one
                        </span>
                    </div>
                </div>

                <div className="border-t border-hairline pt-6">
                    <label htmlFor="missionSettingsRevealCorrectAnswer" className="flex items-start gap-3 cursor-pointer">
                        <input
                            id="missionSettingsRevealCorrectAnswer"
                            type="checkbox"
                            checked={revealCorrectAnswer}
                            onChange={(e) => setRevealCorrectAnswer(e.target.checked)}
                            className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-hairline text-brand focus:ring-2 focus:ring-brand/30"
                        />
                        <span>
                            <span className="text-label text-ink-soft block">
                                Show the correct answer after a wrong attempt
                            </span>
                            <span className="text-caption text-text-secondary">
                                When off, students only see whether they were right or wrong — not what the
                                correct answer was.
                            </span>
                        </span>
                    </label>
                </div>

                <div>
                    <label htmlFor="missionSettingsShuffleOptions" className="flex items-start gap-3 cursor-pointer">
                        <input
                            id="missionSettingsShuffleOptions"
                            type="checkbox"
                            checked={shuffleOptions}
                            onChange={(e) => setShuffleOptions(e.target.checked)}
                            className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-hairline text-brand focus:ring-2 focus:ring-brand/30"
                        />
                        <span>
                            <span className="text-label text-ink-soft block">
                                Shuffle answer order for each student
                            </span>
                            <span className="text-caption text-text-secondary">
                                When off, options always appear in the order you added them.
                            </span>
                        </span>
                    </label>
                </div>

                {errors.length > 0 && (
                    <div className="border-t border-hairline pt-6">
                        {errors.map((e, i) => (
                            <p key={i} className="text-caption text-error" role="alert">
                                {e}
                            </p>
                        ))}
                    </div>
                )}

                <div className="border-t border-hairline pt-6">
                    {published ? (
                        <div className="flex items-center justify-between gap-4 bg-brand-soft rounded-md p-5">
                            <div>
                                <p className="text-body-emphasis text-brand">Posted</p>
                                <p className="text-caption text-text-secondary mt-0.5">
                                    Students in this course can see this mission. Click Update to save
                                    any changes above — nothing changes until you click it.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isPending}
                                className="clay-button px-6 bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60 shrink-0"
                            >
                                {isPending ? 'Saving…' : 'Update'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isPending || !hasActivities}
                                className="clay-button px-6 bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60"
                            >
                                {isPending ? 'Posting…' : 'Save & Post'}
                            </button>
                            {!hasActivities && (
                                <span className="text-caption text-text-secondary">
                                    Add at least one activity first
                                </span>
                            )}
                            {saved && !isPending && (
                                <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                                    Posted
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {published && (
                    <div className="border-t border-hairline pt-6">
                        <p className="text-label text-ink-soft mb-2">Reset student progress</p>
                        <p className="text-caption text-text-secondary mb-4">
                            If you&apos;ve edited or added activities, students who already started this
                            mission are still on their old streak/state — it doesn&apos;t update on its own.
                            Resetting wipes every student&apos;s progress on this mission (streaks, mastery,
                            and their answer history for it) so everyone starts fresh against the current
                            version. This cannot be undone.
                        </p>

                        {!isResetConfirming ? (
                            <button
                                type="button"
                                onClick={() => setIsResetConfirming(true)}
                                className="min-h-touch px-6 rounded-2xl border-2 border-error text-error font-semibold hover:bg-error-soft disabled:opacity-60"
                            >
                                Reset student progress…
                            </button>
                        ) : (
                            <div className="rounded-2xl border-2 border-error bg-error-soft p-5">
                                <p className="text-body-emphasis text-ink">
                                    Reset every student&apos;s progress on &ldquo;{title}&rdquo;?
                                </p>
                                <p className="text-caption text-text-secondary mt-1">
                                    This can&apos;t be undone — everyone currently unlocked or mastered on
                                    this mission goes back to zero.
                                </p>
                                {resetError && <p className="text-caption text-error mt-2">{resetError}</p>}
                                <div className="mt-3 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsResetConfirming(false)}
                                        disabled={isResetting}
                                        className="h-10 px-4 rounded-md border-2 border-hairline bg-surface text-ink text-caption font-medium hover:bg-surface-sunken disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetProgress}
                                        disabled={isResetting}
                                        className="h-10 px-4 rounded-md bg-error text-on-ink text-caption font-semibold hover:opacity-90 disabled:opacity-60"
                                    >
                                        {isResetting ? 'Resetting…' : 'Reset progress'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {resetResult !== null && (
                            <p className="text-caption text-brand mt-3">
                                Done — reset progress for {resetResult} student{resetResult === 1 ? '' : 's'}.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
