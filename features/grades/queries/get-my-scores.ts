'use server'
// Student's own scores, Classroom's "No overall grade" mode: a flat
// list of every graded assignment/quiz and the student's score on
// each. No total, no average, no aggregate anywhere — this replaces
// get-my-final-grade.ts entirely, not a simplified version of it.
// Ungraded items are simply omitted, not shown as 0.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type MyScoreRow = {
    id: string
    kind: 'assignment' | 'quiz'
    title: string
    score: number
    maxScore: number
    courseId: string
    courseTitle: string
}

export async function getMyScores(courseId?: string): Promise<MyScoreRow[]> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    let enrollmentsQuery = supabase
        .from('enrollments')
        .select('course_id, courses!inner(id, title)')
        .eq('student_id', user.id)
        .eq('status', 'active')
    if (courseId) {
        enrollmentsQuery = enrollmentsQuery.eq('course_id', courseId)
    }
    const { data: enrollments } = await enrollmentsQuery

    const courses = (enrollments ?? []).map((e: any) => ({ id: e.courses.id, title: e.courses.title }))
    if (courses.length === 0) return []

    const courseIds = courses.map((c) => c.id)
    const courseTitleById = new Map(courses.map((c) => [c.id, c.title]))

    const [{ data: submissions }, { data: attempts }] = await Promise.all([
        supabase
            .from('assignment_submissions')
            .select('assignment_id, score, assignments!inner(id, title, course_id, max_score)')
            .eq('student_id', user.id)
            .not('score', 'is', null)
            .in('assignments.course_id', courseIds),
        supabase
            .from('quiz_attempts')
            .select('quiz_id, score, quizzes!inner(id, title, course_id, questions(points))')
            .eq('student_id', user.id)
            .eq('status', 'graded')
            .in('quizzes.course_id', courseIds),
    ])

    const rows: MyScoreRow[] = [
        ...(submissions ?? []).map((s: any) => ({
            id: s.assignments.id as string,
            kind: 'assignment' as const,
            title: s.assignments.title as string,
            score: s.score as number,
            maxScore: s.assignments.max_score as number,
            courseId: s.assignments.course_id as string,
            courseTitle: courseTitleById.get(s.assignments.course_id) ?? '',
        })),
        ...(attempts ?? []).map((a: any) => ({
            id: a.quizzes.id as string,
            kind: 'quiz' as const,
            title: a.quizzes.title as string,
            score: a.score as number,
            maxScore: (a.quizzes.questions ?? []).reduce((sum: number, x: any) => sum + (x.points ?? 0), 0),
            courseId: a.quizzes.course_id as string,
            courseTitle: courseTitleById.get(a.quizzes.course_id) ?? '',
        })),
    ]

    return rows
}
