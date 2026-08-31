// app/(dashboard)/teacher/courses/[courseId]/lessons/[lessonId]/missions/[missionId]/edit/page.tsx
//
// Revised now that QuizSettingsForm.tsx and QuestionCard.tsx are
// available to mirror properly — this replaces the earlier version's
// hand-rolled read-only activity list with MissionSettingsForm +
// ActivityCard, matching the real quiz-edit-page pattern.
//
// Still inferred (no actual quizzes/[quizId]/edit/page.tsx was
// provided): the overall page shell/layout below. If the real one
// differs — a shared breadcrumb, a different section order — bring
// this in line.
//
// BackButton removed: this page had its own BackButton PLUS whatever
// is rendering one at the missions/[missionId]/ route level — sibling
// mission page (new/page.tsx, a different static segment) does NOT
// double up, which rules out a global dashboard-layout back button and
// points instead at something scoped specifically to the [missionId]
// dynamic segment (most likely a layout.tsx shared across edit/
// attempts/preview-style routes, mirroring however quizzes/[quizId]/
// is set up). That file wasn't provided, so this is confirmed by
// elimination rather than by reading it directly — worth a quick check
// if a third mission route ever gets added under [missionId]/ and
// needs the same treatment.
//
// REMEDIATION FIX (2026-08-30, continued conversation): both
// ActivityCard and AddActivityForm now need the full `activities`
// array (not just the single activity each ActivityCard already
// received) to build their remediation-picker sibling lists — passed
// through as allActivities / existingActivities below. `activities`
// was already being fetched via getMissionForTeacher for the list
// itself, so this is just passing something already-in-scope further
// down, not a new query.
//
// DESIGN-LMS 2.1 PASS: text-heading-lg/text-heading-sm replaced with
// text-h1/text-h3 — same invalid-token bug as the sibling new/page.tsx
// and the mission gameplay page fixed earlier this track. Classroom
// Mode authoring page, no Fredoka.

import { notFound } from 'next/navigation'
import { getMissionForTeacher, getMissionProgressForTeacher } from '@/features/missions/actions/create-mission'
import { MissionSettingsForm } from '@/features/missions/components/MissionSettingsForm'
import { ActivityCard } from '@/features/missions/components/ActivityCard'
import { AddActivityForm } from '@/features/missions/components/AddActivityForm'
import { MissionProgressOverride } from '@/features/missions/components/MissionProgressOverride'

export default async function EditMissionPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string; missionId: string }>
}) {
    const { courseId, lessonId, missionId } = await params

    const result = await getMissionForTeacher(missionId)
    if (!result) {
        notFound()
    }
    const { mission, activities } = result
    const m = mission as any

    // GAP #3: only meaningful once the mission is postable/posted —
    // same reasoning as the reset-progress control in
    // MissionSettingsForm.tsx. Fetched here (not inside
    // MissionProgressOverride itself) since it needs the SAME
    // ownership-scoped server context as everything else on this page.
    const progressResult = m.is_published ? await getMissionProgressForTeacher(missionId) : null

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
            <div>
                <p className="text-caption text-text-secondary">
                    {m.lessons.courses.title} — {m.lessons.title}
                </p>
                <h1 className="text-h1 text-ink">{m.title}</h1>
            </div>

            <MissionSettingsForm
                missionId={missionId}
                courseId={courseId}
                lessonId={lessonId}
                currentTitle={m.title}
                currentDescription={m.description}
                currentMasteryThreshold={m.mastery_threshold}
                totalActivities={activities.length}
                isPublished={m.is_published}
            />

            <div className="space-y-4">
                <h2 className="text-h3 text-ink">Activities ({activities.length})</h2>
                {activities.length === 0 && (
                    <p className="text-body-md text-text-secondary">No activities yet — add the first one below.</p>
                )}
                {activities.map((activity: any, index: number) => (
                    <ActivityCard
                        key={activity.id}
                        activity={activity}
                        index={index}
                        missionId={missionId}
                        allActivities={activities}
                    />
                ))}
            </div>

            <div>
                <h2 className="text-h3 text-ink mb-3">Add another activity</h2>
                <AddActivityForm missionId={missionId} existingActivities={activities} />
            </div>

            {progressResult && (
                <div>
                    <h2 className="text-h3 text-ink mb-3">Student progress</h2>
                    <MissionProgressOverride
                        missionId={missionId}
                        rows={progressResult.rows}
                        masteryThreshold={progressResult.masteryThreshold}
                    />
                </div>
            )}
        </div>
    )
}
