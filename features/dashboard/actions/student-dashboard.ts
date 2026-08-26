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

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'

export type ContinueLearningItem = {
    courseId: string
    courseName: string
    lessonId: string
    lessonTitle: string
}

export type StudentCoursePreview = {
    id: string
    title: string
    subject: string | null
    description: string | null
    teacherName: string | null
    teacherAvatarUrl: string | null
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

        supabase
            .from('lesson_completions')
            .select('lesson_id')
            .eq('student_id', user.id),
    ])

    const completedLessonIds = new Set((completionsResult.data ?? []).map((c) => c.lesson_id))

    const continueLearning: ContinueLearningItem[] = []
    for (const courseId of courseIds) {
        const nextLesson = (lessonsResult.data ?? []).find(
            (l) => l.course_id === courseId && !completedLessonIds.has(l.id)
        )
        if (nextLesson) {
            continueLearning.push({
                courseId,
                courseName: courseNameById.get(courseId) ?? 'Course',
                lessonId: nextLesson.id,
                lessonTitle: nextLesson.title,
            })
        }
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
