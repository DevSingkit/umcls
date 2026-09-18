// app/(dashboard)/student/courses/[courseId]/lessons/[lessonId]/missions/[missionId]/page.tsx

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMissionsForStudent, getMissionPreviewForStudent } from '@/features/missions/actions/get-mission-for-student'
import { ActivityRunner } from '@/features/missions/components/ActivityRunner'

export default async function TakeMissionPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string; missionId: string }>
}) {
    const { courseId, lessonId, missionId } = await params

    const missions = await getMissionsForStudent(lessonId)
    const missionState = missions.find((m) => m.id === missionId)

    if (!missionState) {
        notFound()
    }

    if (missionState.status === 'locked') {
        return (
            <div className="max-w-2xl mx-auto py-10 px-4 space-y-4 text-center">
                <div className="bg-surface-sunken rounded-md border border-hairline p-6 space-y-2">
                    <p className="font-heading text-mission text-ink">This mission is locked</p>
                    <p className="font-sans text-body-md text-text-secondary">
                        Complete the mission before it in the path to unlock this one.
                    </p>
                </div>
                {/* AppShell strips all nav chrome on this route (full-screen
                    Mission Mode), so this state needs its own way out. */}
                <Link
                    href={`/student/courses/${courseId}/lessons/${lessonId}`}
                    className="inline-block font-sans text-body-emphasis text-brand hover:underline"
                >
                    ← Back to lesson
                </Link>
            </div>
        )
    }

    let mission
    try {
        mission = await getMissionPreviewForStudent(missionId)
    } catch {
        notFound()
    }

    return (
        <ActivityRunner
            mission={mission}
            courseId={courseId}
            lessonId={lessonId}
            initialCorrectStreak={missionState.correctStreak}
        />
    )
}
