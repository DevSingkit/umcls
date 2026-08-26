// app/(dashboard)/student/courses/[courseId]/lessons/[lessonId]/missions/[missionId]/page.tsx
//
// The route MissionPath.tsx (Day 3) already links to for unlocked/
// mastered missions. No quiz precedent for the page shell either —
// inferred structure, same caveat as the teacher mission pages: if a
// real layout convention exists for student lesson-scoped routes that
// this doesn't match, bring it in line.
//
// Defense in depth: MissionPath.tsx never renders a Link for a locked
// mission, but that only stops in-app navigation — someone could still
// type this URL directly. getMissionsForStudent is re-checked here
// server-side before rendering ActivityRunner at all, and
// submitActivityAttempt independently re-checks the same thing before
// grading anything, so a locked mission can't be played by URL even if
// this page's own guard were somehow bypassed.

import { notFound } from 'next/navigation'
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
            <div className="max-w-2xl mx-auto py-8 px-4">
                <div className="bg-surface-sunken rounded-md border border-hairline p-6 text-center space-y-2">
                    <p className="text-body-emphasis text-ink">This mission is locked</p>
                    <p className="text-body-md text-text-secondary">
                        Complete the mission before it in the path to unlock this one.
                    </p>
                </div>
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
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
            <div>
                <h1 className="text-heading-lg text-ink">{mission.title}</h1>
                {mission.description && <p className="text-body-md text-text-secondary mt-1">{mission.description}</p>}
            </div>

            <ActivityRunner
                mission={mission}
                courseId={courseId}
                lessonId={lessonId}
                initialCorrectStreak={missionState.correctStreak}
            />
        </div>
    )
}
