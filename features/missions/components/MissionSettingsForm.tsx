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

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMissionSettings } from '@/features/missions/actions/create-mission'

export function MissionSettingsForm({
    missionId,
    courseId,
    lessonId,
    currentTitle,
    currentDescription,
    currentMasteryThreshold,
    totalActivities,
    isPublished,
}: {
    missionId: string
    courseId: string
    lessonId: string
    currentTitle: string
    currentDescription: string | null
    currentMasteryThreshold: number
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
        <div className="bg-surface rounded-md border border-hairline shadow-card p-6 mb-8 space-y-8">
            <div>
                <label htmlFor="missionSettingsTitle" className="text-label text-ink-soft block mb-2">
                    Mission name <span className="text-error">(required)</span>
                </label>
                <input
                    id="missionSettingsTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-11 px-4 text-body-emphasis text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
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
                    className="w-full px-5 py-3 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
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
                        className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <span className="text-body-md text-text-secondary">
                        A student unlocks the next mission after {masteryThreshold} correct answer
                        {masteryThreshold === 1 ? '' : 's'} in a row on this one
                    </span>
                </div>
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
                            className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60 shrink-0"
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
                            className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60"
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
        </div>
    )
}
