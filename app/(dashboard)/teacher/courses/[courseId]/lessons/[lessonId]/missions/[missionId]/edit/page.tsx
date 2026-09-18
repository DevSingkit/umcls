// app/(dashboard)/teacher/courses/[courseId]/lessons/[lessonId]/missions/[missionId]/edit/page.tsx
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
    const totalQuestionCount = activities.reduce(
        (sum: number, a: any) => sum + (a.questions?.length ?? 0),
        0
    )

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
                currentRevealCorrectAnswer={m.reveal_correct_answer}
                currentShuffleOptions={m.shuffle_options}
                totalActivities={activities.length}
                isPublished={m.is_published}
            />

            <div className="space-y-4">
                <h2 className="text-h3 text-ink">
                    {activities.length} {activities.length === 1 ? 'activity' : 'activities'}, {totalQuestionCount}{' '}
                    {totalQuestionCount === 1 ? 'question' : 'questions'}
                </h2>
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
        </div>
    )
}
