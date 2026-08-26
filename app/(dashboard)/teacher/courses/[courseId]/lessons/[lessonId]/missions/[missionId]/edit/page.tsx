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

import { notFound } from 'next/navigation'
import { getMissionForTeacher } from '@/features/missions/actions/create-mission'
import { MissionSettingsForm } from '@/features/missions/components/MissionSettingsForm'
import { ActivityCard } from '@/features/missions/components/ActivityCard'
import { AddActivityForm } from '@/features/missions/components/AddActivityForm'

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

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
            <div>
                <p className="text-caption text-text-secondary">
                    {m.lessons.courses.title} — {m.lessons.title}
                </p>
                <h1 className="text-heading-lg text-ink">{m.title}</h1>
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
                <h2 className="text-heading-sm text-ink">Activities ({activities.length})</h2>
                {activities.length === 0 && (
                    <p className="text-body-md text-text-secondary">No activities yet — add the first one below.</p>
                )}
                {activities.map((activity: any, index: number) => (
                    <ActivityCard key={activity.id} activity={activity} index={index} missionId={missionId} />
                ))}
            </div>

            <div>
                <h2 className="text-heading-sm text-ink mb-3">Add another activity</h2>
                <AddActivityForm missionId={missionId} />
            </div>
        </div>
    )
}
