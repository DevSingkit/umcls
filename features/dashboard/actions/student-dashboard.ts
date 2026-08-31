'use server'
// See lib/auth/AUTH_NOTES.md for why these checks exist.
// "Continue learning" = the earliest lesson (by order_index) in each
// enrolled course that this student has not completed yet. No "last
// viewed" tracking exists in the schema, and none is being added — this
// is a deliberate simpler stand-in, confirmed with the team. It cannot
// tell "never opened" apart from "opened but not marked complete," and
// it cannot resume mid-lesson; both are accepted trade-offs.
//
// RecentGradeItem/recentGrades REMOVED (2026-08-23) — the dashboard
// page stopped rendering this section per an earlier, unrelated design
// review, and the per-item Grades tab (features/grades/queries/
// get-my-scores.ts) already covers this exact need properly scoped to
// a course. Confirmed unused anywhere else before deleting the
// computation, not just the display component.
//
// PHASE 3.5 REWORK (ADAPTIVE-ENGINE-PLAN.md/LOG.md, 2026-08-28): the
// paragraph above describes the OLD, lesson-only behavior. For any
// course that has at least one published mission anywhere, continue
// learning now points at a MISSION instead of just a lesson — the
// earliest (lesson order_index, then mission order_index) mission
// whose status, from getMissionsForStudent (reused directly, not
// re-derived, per this project's own convention of never letting two
// places compute mission-unlock status independently and risk
// disagreeing), is 'unlocked'. If nothing is 'unlocked' for a course
// (every reachable mission is already 'mastered'), that course is
// omitted from continueLearning entirely — it's done, nothing to
// continue.
//
// Fallback, confirmed as a reasonable default rather than assumed
// silently — flag this if it turns out wrong: a course with ZERO
// published missions anywhere keeps the OLD lesson-completion-based
// behavior untouched, so lesson-only (not yet gamified) courses don't
// break. A course is treated as EITHER fully mission-based or fully
// lesson-based for this purpose, never a per-lesson mix — a lesson
// inside a mission-based course that happens to have no missions of
// its own is simply not considered for continue-learning targeting
// (its content might still be worth reading, but this function's job
// is picking ONE next thing to do, not enumerating everything
// incomplete).

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'
import { getMissionsForStudent } from '@/features/missions/actions/get-mission-for-student'

export type ContinueLearningReason = 'new' | 'in_progress' | 'needs_practice'

export type ContinueLearningItem = {
    courseId: string
    courseName: string
    lessonId: string
    lessonTitle: string
    // PHASE 3.5 ADDITION: present when this item's target is a mission
    // (the course has mission-based content). Null for the legacy
    // lesson-only fallback path described above — ContinueLearning.tsx
    // uses this to decide which URL/copy to render.
    mission: {
        id: string
        title: string
        // 'new' = student has never attempted anything in this mission
        //   yet (zero activity_mastery rows).
        // 'needs_practice' = has attempted, and has gotten at least one
        //   activity wrong at some point (activity_mastery.wrong_count
        //   > 0 on some row).
        // 'in_progress' = has attempted, no wrong answers yet — steady
        //   progress, no struggle signal.
        // This three-way mapping was proposed, not independently
        // confirmed with the user beyond the earlier planning
        // discussion — flagged in the log, worth a second look once
        // real student data exists to sanity-check the copy/feel.
        reason: ContinueLearningReason
    } | null
}

export type StudentCoursePreview = {
    id: string
    title: string
    subject: string | null
    description: string | null
    teacherName: string | null
    teacherAvatarUrl: string | null
}

// PHASE 3.5: reason classification for a chosen target mission — see
// the ContinueLearningItem['mission']['reason'] doc comment above for
// the exact rule. Scoped to just the ONE target mission per course, not
// every mission, since that's all the dashboard ever needs; querying
// every mission's activity_mastery up front would be wasted work for
// missions that were never going to be shown.
async function classifyMissionReason({
    supabase,
    studentId,
    missionId,
}: {
    supabase: Awaited<ReturnType<typeof createClient>>
    studentId: string
    missionId: string
}): Promise<ContinueLearningReason> {
    const { data: activities } = await supabase.from('activities').select('id').eq('mission_id', missionId)

    const activityIds = (activities ?? []).map((a) => a.id)
    if (activityIds.length === 0) {
        return 'new'
    }

    const { data: masteryRows } = await supabase
        .from('activity_mastery')
        .select('wrong_count')
        .eq('student_id', studentId)
        .in('activity_id', activityIds)

    if (!masteryRows || masteryRows.length === 0) {
        return 'new'
    }

    const hasAnyWrong = masteryRows.some((m) => m.wrong_count > 0)
    return hasAnyWrong ? 'needs_practice' : 'in_progress'
}

export async function getStudentDashboardData() {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(
            'course_id, courses!inner(id, title, subject, description, created_at, users!courses_teacher_id_fkey(full_name, avatar_url))'
        )
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('created_at', { referencedTable: 'courses', ascending: false })

    const courseList = (enrollments ?? []).map((e: any) => e.courses)
    const courseIds = courseList.map((c: any) => c.id)

    if (courseIds.length === 0) {
        return {
            continueLearning: [] as ContinueLearningItem[],
            coursesPreview: [] as StudentCoursePreview[],
            courseNameById: new Map<string, string>(),
        }
    }

    const courseNameById = new Map(courseList.map((c: any) => [c.id, c.title]))

    const [lessonsResult, completionsResult] = await Promise.all([
        // All published lessons in the student's courses, ordered so the
        // first not-completed one per course is easy to pick out below.
        supabase
            .from('lessons')
            .select('id, course_id, title, order_index')
            .in('course_id', courseIds)
            .eq('is_published', true)
            .is('deleted_at', null)
            .order('order_index', { ascending: true }),

        supabase.from('lesson_completions').select('lesson_id').eq('student_id', user.id),
    ])

    const completedLessonIds = new Set((completionsResult.data ?? []).map((c) => c.lesson_id))
    const allLessons = lessonsResult.data ?? []
    const lessonIds = allLessons.map((l) => l.id)

    // PHASE 3.5: which lessons have mission-based content at all — the
    // signal that decides, per course, whether to use the new
    // mission-based targeting or fall back to the old lesson-only
    // behavior (see top-of-file note).
    const { data: allMissions } = await supabase
        .from('missions')
        .select('id, lesson_id')
        .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('is_published', true)
        .is('deleted_at', null)

    const lessonIdsWithMissions = new Set((allMissions ?? []).map((m) => m.lesson_id))
    const coursesWithAnyMission = new Set(
        allLessons.filter((l) => lessonIdsWithMissions.has(l.id)).map((l) => l.course_id)
    )

    const continueLearning: ContinueLearningItem[] = []

    for (const courseId of courseIds) {
        const courseName = courseNameById.get(courseId) ?? 'Course'
        const lessonsInCourse = allLessons
            .filter((l) => l.course_id === courseId)
            .sort((a, b) => a.order_index - b.order_index)

        if (!coursesWithAnyMission.has(courseId)) {
            // Legacy fallback — byte-identical to the pre-Phase-3.5
            // logic, for courses with no mission-based content yet.
            const nextLesson = lessonsInCourse.find((l) => !completedLessonIds.has(l.id))
            if (nextLesson) {
                continueLearning.push({
                    courseId,
                    courseName,
                    lessonId: nextLesson.id,
                    lessonTitle: nextLesson.title,
                    mission: null,
                })
            }
            continue
        }

        // Mission-based targeting: walk this course's lessons in order,
        // and within each lesson that has missions, reuse
        // getMissionsForStudent (Phase 3's own bootstrapping-default
        // logic, not re-derived here) to find the earliest 'unlocked'
        // mission. Stops at the first hit — sequential, not
        // Promise.all'd, so a course where everything is already
        // mastered still has to check every lesson to CONFIRM nothing
        // is unlocked. Acceptable for a dashboard-scale number of
        // lessons; flagged as a possible future optimization rather
        // than something worth complicating this code for now.
        for (const lesson of lessonsInCourse) {
            if (!lessonIdsWithMissions.has(lesson.id)) continue

            const missionsForLesson = await getMissionsForStudent(lesson.id)
            const target = missionsForLesson.find((m) => m.status === 'unlocked')

            if (target) {
                const reason = await classifyMissionReason({
                    supabase,
                    studentId: user.id,
                    missionId: target.id,
                })

                continueLearning.push({
                    courseId,
                    courseName,
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                    mission: { id: target.id, title: target.title, reason },
                })
                break
            }
        }
        // No 'unlocked' mission found anywhere in the course after
        // checking every lesson — every reachable mission is mastered.
        // Nothing pushed for this course, matching the "all mastered,
        // omit" case.
    }

    const coursesPreview: StudentCoursePreview[] = courseList.slice(0, 4).map((c: any) => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
        description: c.description,
        teacherName: c.users?.full_name ?? null,
        teacherAvatarUrl: c.users?.avatar_url ?? null,
    }))

    return { continueLearning, coursesPreview, courseNameById }
}
