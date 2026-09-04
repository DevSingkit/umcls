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
//
// DESIGN-LMS 2.1 PASS (2026-08-31): this page is Mission Mode per the
// locked mode split (lesson reading / mission gameplay / mission
// results only). Two real bugs fixed, no logic touched:
// (1) mission title used `text-heading-lg`, which isn't a token in
//     tailwind.config.ts, and had no font-heading at all — rendering
//     in the default Roboto/document font instead of Fredoka. Fixed
//     using the new `mission` fontSize token (22px mobile / 28px
//     desktop per DESIGN-LMS 2.1 §3's typography table) + font-heading.
// (2) Mission Mode body text (mission description, locked-state
//     copy) wasn't using Nunito — added font-sans, which resolves to
//     Nunito in this app's font stack, per the locked font decision
//     (Nunito = Mission Mode body/UI text app-wide).

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
