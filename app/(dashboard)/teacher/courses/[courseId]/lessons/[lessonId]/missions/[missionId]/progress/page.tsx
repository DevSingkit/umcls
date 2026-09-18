// app/(dashboard)/teacher/courses/[courseId]/lessons/[lessonId]/missions/[missionId]/progress/page.tsx
import { notFound } from 'next/navigation'
import { getMissionForTeacher, getMissionProgressForTeacher } from '@/features/missions/actions/create-mission'
import { MissionProgressOverride } from '@/features/missions/components/MissionProgressOverride'

export default async function MissionProgressPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string; missionId: string }>
}) {
    const { missionId } = await params

    const result = await getMissionForTeacher(missionId)
    if (!result) {
        notFound()
    }
    const { mission } = result
    const m = mission as any

    const progressResult = m.is_published ? await getMissionProgressForTeacher(missionId) : null

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
            <div>
                <p className="text-caption text-text-secondary">
                    {m.lessons.courses.title} — {m.lessons.title}
                </p>
                <h1 className="text-h1 text-ink">{m.title}</h1>
                <p className="text-body-md text-text-secondary mt-1">Student progress</p>
            </div>

            {progressResult ? (
                <MissionProgressOverride
                    missionId={missionId}
                    rows={progressResult.rows}
                    masteryThreshold={progressResult.masteryThreshold}
                    analytics={progressResult.analytics}
                />
            ) : (
                <div className="bg-surface rounded-md border border-hairline shadow-card p-6 text-center">
                    <p className="text-body-md text-text-secondary">
                        Publish this mission to start seeing student progress here.
                    </p>
                </div>
            )}
        </div>
    )
}
