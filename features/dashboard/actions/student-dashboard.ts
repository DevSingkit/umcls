'use server'
// See lib/auth/AUTH_NOTES.md for why these checks exist.
// "Continue learning" = the earliest lesson (by order_index) in each
// enrolled course that this student has not completed yet. No "last
// viewed" tracking exists in the schema, and none is being added — this
// is a deliberate simpler stand-in, confirmed with the team. It cannot
// tell "never opened" apart from "opened but not marked complete," and
// it cannot resume mid-lesson; both are accepted trade-offs.

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'

export type ContinueLearningItem = {
    courseId: string
    courseName: string
    lessonId: string
    lessonTitle: string
}

export type RecentGradeItem = {
    id: string
    kind: 'assignment' | 'quiz'
    title: string
    courseName: string
    score: number
    maxScore: number
    gradedAt: string
    href: string
}

export type StudentCoursePreview = {
    id: string
    title: string
    subject: string | null
}

export async function getStudentDashboardData() {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, courses!inner(id, title, subject, created_at)')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('created_at', { referencedTable: 'courses', ascending: false })

    const courseList = (enrollments ?? []).map((e: any) => e.courses)
    const courseIds = courseList.map((c: any) => c.id)

    if (courseIds.length === 0) {
        return {
            continueLearning: [] as ContinueLearningItem[],
            recentGrades: [] as RecentGradeItem[],
            coursesPreview: [] as StudentCoursePreview[],
        }
    }

    const courseNameById = new Map(courseList.map((c: any) => [c.id, c.title]))

    const [lessonsResult, completionsResult, submissionsResult, quizAttemptsResult] = await Promise.all([
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

        // Graded assignment submissions, most recent first.
        supabase
            .from('assignment_submissions')
            .select(
                'id, score, graded_at, assignment_id, assignments!inner(title, max_score, course_id)'
            )
            .eq('student_id', user.id)
            .eq('status', 'graded')
            .not('graded_at', 'is', null)
            .order('graded_at', { ascending: false })
            .limit(10),

        // Graded quiz attempts, most recent first.
        supabase
            .from('quiz_attempts')
            .select('id, score, graded_at, quiz_id, quizzes!inner(title, course_id)')
            .eq('student_id', user.id)
            .eq('status', 'graded')
            .not('graded_at', 'is', null)
            .order('graded_at', { ascending: false })
            .limit(10),
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

    const assignmentGrades: RecentGradeItem[] = (submissionsResult.data ?? []).map((s: any) => ({
        id: s.id,
        kind: 'assignment' as const,
        title: s.assignments?.title ?? 'Assignment',
        courseName: courseNameById.get(s.assignments?.course_id) ?? 'Course',
        score: s.score ?? 0,
        maxScore: s.assignments?.max_score ?? 100,
        gradedAt: s.graded_at,
        href: `/student/courses/${s.assignments?.course_id}/assignments/${s.assignment_id}`,
    }))

    const quizGrades: RecentGradeItem[] = (quizAttemptsResult.data ?? []).map((a: any) => ({
        id: a.id,
        kind: 'quiz' as const,
        title: a.quizzes?.title ?? 'Quiz',
        courseName: courseNameById.get(a.quizzes?.course_id) ?? 'Course',
        score: a.score ?? 0,
        maxScore: 100,
        gradedAt: a.graded_at,
        href: `/student/courses/${a.quizzes?.course_id}/quizzes/${a.quiz_id}/results`,
    }))

    const recentGrades = [...assignmentGrades, ...quizGrades]
        .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())
        .slice(0, 6)

    const coursesPreview: StudentCoursePreview[] = courseList.slice(0, 4).map((c: any) => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
    }))

    return { continueLearning, recentGrades, coursesPreview, courseNameById }
}
