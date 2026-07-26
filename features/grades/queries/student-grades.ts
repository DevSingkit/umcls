// See lib/auth/AUTH_NOTES.md for why these checks exist.
//
// Student-scoped counterpart to features/grades/queries/gradebook.ts.
// Not a reuse of those queries — those require ['teacher'] and query by
// courseId across all enrolled students; this queries by the logged-in
// student's own id only, which is a different shape, not just a
// filtered version of the same thing.

import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type MyAssignmentGrade = {
    submissionId: string | null
    assignmentId: string
    title: string
    maxScore: number
    score: number | null
    feedback: string | null
    status: string | null // null if never submitted
}

export type MyQuizGrade = {
    attemptId: string
    quizId: string
    title: string
    score: number | null
    isPassing: boolean | null
    status: string
    submittedAt: string | null
}

export async function getMyGradesForCourse(courseId: string): Promise<{
    assignments: MyAssignmentGrade[]
    quizzes: MyQuizGrade[]
} | null> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

    if (!enrollment) return null

    const { data: assignments } = await supabase
        .from('assignments')
        .select(
            'id, title, max_score, assignment_submissions(id, score, feedback, status, student_id)'
        )
        .eq('course_id', courseId)
        .eq('is_published', true)
        .is('deleted_at', null)

    const assignmentGrades: MyAssignmentGrade[] = (assignments ?? []).map((a: any) => {
        const mySubmission = (a.assignment_submissions ?? []).find(
            (s: any) => s.student_id === user.id
        )
        return {
            submissionId: mySubmission?.id ?? null,
            assignmentId: a.id,
            title: a.title,
            maxScore: a.max_score,
            score: mySubmission?.score ?? null,
            feedback: mySubmission?.feedback ?? null,
            status: mySubmission?.status ?? null,
        }
    })

    const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, quiz_attempts(id, score, is_passing, status, submitted_at, student_id)')
        .eq('course_id', courseId)
        .eq('is_published', true)

    const quizGrades: MyQuizGrade[] = []
    for (const q of quizzes ?? []) {
        const myAttempts = ((q as any).quiz_attempts ?? []).filter(
            (a: any) => a.student_id === user.id
        )
        // A student can have more than one attempt if max_attempts > 1 —
        // show the most recent one here, same "latest counts" idea used
        // elsewhere (e.g. resubmission replacing the prior grade).
        const latest = myAttempts.sort(
            (a: any, b: any) => new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime()
        )[0]

        if (latest) {
            quizGrades.push({
                attemptId: latest.id,
                quizId: q.id,
                title: q.title,
                score: latest.score,
                isPassing: latest.is_passing,
                status: latest.status,
                submittedAt: latest.submitted_at,
            })
        }
    }

    return { assignments: assignmentGrades, quizzes: quizGrades }
}
