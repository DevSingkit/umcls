'use server'
// features/dashboard/actions/get-mastered-missions.ts
//
// Phase 3.6 (ADAPTIVE-ENGINE-PLAN.md): a second, separate
// dashboard section from ContinueLearning.tsx (Phase 3.5) — this one
// lists missions the student has ALREADY mastered, per course, so they
// can freely replay them for fun/practice. Distinct concept from
// "continue learning": that surfaces not-yet-done work, this surfaces
// done work available for optional replay.
//
// No new "replay mode" plumbing needed on the write side — confirmed
// by re-reading this session's own Phase 2/3 work rather than
// re-deriving: submitActivityAttempt already infers
// isReviewOfMasteredMission SERVER-SIDE from mission_progress.status
// === 'mastered', not from any client-passed flag. So the plan's
// "isReplay: boolean" mechanism the write path was expected to need
// is already satisfied — tapping a card here just opens the existing
// mission route, same as any other mission link, and the server
// handles the non-destructive-replay behavior automatically.
//
// "Mastered" here uses the EXISTING mission_progress.status ===
// 'mastered' definition (the mission-wide N-in-a-row-anywhere
// mechanism), not "every activity individually mastered" — same
// definition confirmed with user during the Phase 2.5 discussion, for
// consistency with what the rest of the app already means by
// "mastered."

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'

export type MasteredMissionCard = {
    missionId: string
    missionTitle: string
    lessonId: string
    masteredAt: string | null
}

export type MasteredMissionsByCourse = {
    courseId: string
    courseName: string
    missions: MasteredMissionCard[]
}

/**
 * One group per enrolled course that has at least one mastered
 * mission (courses with zero mastered missions are omitted entirely —
 * nothing to replay yet). Within a course, missions are ordered most-
 * recently-mastered first — a guess at the most useful default for
 * "what would I want to replay," not something the plan specified;
 * flagged in the log, easy to flip to order_index if that reads
 * better in practice.
 */
export async function getMasteredMissionsForStudent(): Promise<MasteredMissionsByCourse[]> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, courses!inner(id, title)')
        .eq('student_id', user.id)
        .eq('status', 'active')

    const courseList = (enrollments ?? []).map((e: any) => e.courses)
    const courseIds = courseList.map((c: any) => c.id)

    if (courseIds.length === 0) {
        return []
    }

    const courseNameById = new Map(courseList.map((c: any) => [c.id, c.title]))

    const { data: lessons } = await supabase
        .from('lessons')
        .select('id, course_id')
        .in('course_id', courseIds)
        .eq('is_published', true)
        .is('deleted_at', null)

    const lessonIds = (lessons ?? []).map((l) => l.id)
    const courseIdByLessonId = new Map((lessons ?? []).map((l) => [l.id, l.course_id]))

    if (lessonIds.length === 0) {
        return []
    }

    const { data: missions } = await supabase
        .from('missions')
        .select('id, lesson_id, title')
        .in('lesson_id', lessonIds)
        .eq('is_published', true)
        .is('deleted_at', null)

    const missionIds = (missions ?? []).map((m) => m.id)

    if (missionIds.length === 0) {
        return []
    }

    const { data: masteredProgress } = await supabase
        .from('mission_progress')
        .select('mission_id, mastered_at')
        .eq('student_id', user.id)
        .eq('status', 'mastered')
        .in('mission_id', missionIds)

    const masteredAtByMissionId = new Map((masteredProgress ?? []).map((p) => [p.mission_id, p.mastered_at]))

    const groupsByCourseId = new Map<string, MasteredMissionCard[]>()

    for (const mission of missions ?? []) {
        const masteredAt = masteredAtByMissionId.get(mission.id)
        if (masteredAt === undefined) continue // not mastered — no mission_progress row at all, or a different status

        const courseId = courseIdByLessonId.get(mission.lesson_id)
        if (!courseId) continue

        const list = groupsByCourseId.get(courseId) ?? []
        list.push({
            missionId: mission.id,
            missionTitle: mission.title,
            lessonId: mission.lesson_id,
            masteredAt,
        })
        groupsByCourseId.set(courseId, list)
    }

    // Preserve courseList's own order (enrollment order) for group
    // ordering, same convention as student-dashboard.ts, and sort each
    // course's own missions most-recently-mastered first.
    const result: MasteredMissionsByCourse[] = []
    for (const courseId of courseIds) {
        const missionsForCourse = groupsByCourseId.get(courseId)
        if (!missionsForCourse || missionsForCourse.length === 0) continue

        missionsForCourse.sort((a, b) => {
            if (!a.masteredAt) return 1
            if (!b.masteredAt) return -1
            return new Date(b.masteredAt).getTime() - new Date(a.masteredAt).getTime()
        })

        result.push({
            courseId,
            courseName: courseNameById.get(courseId) ?? 'Course',
            missions: missionsForCourse,
        })
    }

    return result
}
