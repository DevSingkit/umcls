// Gradebook, Classroom-style: no manual columns, no DepEd component
// grouping, no computed Final Grade. A "column" is simply every
// published assignment and quiz in the course — this file replaces
// both the old gradebook_items/gradebook_scores-backed grid query and
// resolveWeightProfileKey (weights no longer exist anywhere).
//
// Read-only by design for G1: editing a score happens through the
// existing per-submission grading flows (SubmissionsGradeList.tsx,
// ShortAnswerGradeList.tsx, AttemptsList.tsx), not inline in this
// grid. Real Classroom does allow inline grid editing, but that would
// mean writing back to two structurally different tables
// (assignment_submissions vs. quiz_attempts/quiz_responses) from one
// generic grid component — a real feature, not a drop-in replacement
// for the old single-table setGradebookScore. Flagged as a deliberate
// scope cut, revisit if inline editing turns out to matter in
// practice.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

async function assertCourseAccess(courseId: string, userId: string, role: string) {
    if (role === 'admin') return true
    const supabase = await createClient()
    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', userId)
        .single()
    return !!course
}

export type GradebookColumn = {
    id: string
    kind: 'assignment' | 'quiz'
    title: string
    maxScore: number
}

export type GradebookData = {
    students: { studentId: string; studentName: string }[]
    columns: GradebookColumn[]
    // score is null when nothing's been graded yet for that
    // student/column pair — the grid renders that as blank, not zero.
    scores: { columnId: string; studentId: string; score: number | null }[]
}

// Full read-only gradebook for a course: every enrolled student
// (alphabetical), every published assignment/quiz as a column, every
// score that exists so far. No weighting, no aggregation — this is
// purely a display of real per-item scores.
export async function getGradebookForCourseGrid(courseId: string): Promise<GradebookData | null> {
    const user = await requireRole(['teacher', 'admin'])
    const hasAccess = await assertCourseAccess(courseId, user.id, user.role)
    if (!hasAccess) return null

    const supabase = await createClient()

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active')

    const students = (enrollments ?? [])
        .map((e: any) => ({ studentId: e.student_id as string, studentName: (e.users?.full_name as string) ?? 'Unknown' }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName))

    const [{ data: assignments }, { data: quizzes }] = await Promise.all([
        supabase
            .from('assignments')
            .select('id, title, max_score')
            .eq('course_id', courseId)
            .is('deleted_at', null)
            .eq('is_published', true)
            .order('created_at', { ascending: true }),
        supabase
            .from('quizzes')
            .select('id, title, questions(points)')
            .eq('course_id', courseId)
            .is('deleted_at', null)
            .eq('is_published', true)
            .order('created_at', { ascending: true }),
    ])

    const columns: GradebookColumn[] = [
        ...(assignments ?? []).map((a: any) => ({
            id: a.id,
            kind: 'assignment' as const,
            title: a.title,
            maxScore: a.max_score,
        })),
        ...(quizzes ?? []).map((q: any) => ({
            id: q.id,
            kind: 'quiz' as const,
            title: q.title,
            maxScore: (q.questions ?? []).reduce((sum: number, x: any) => sum + (x.points ?? 0), 0),
        })),
    ]

    const assignmentIds = (assignments ?? []).map((a: any) => a.id)
    const quizIds = (quizzes ?? []).map((q: any) => q.id)

    const [{ data: submissions }, { data: attempts }] = await Promise.all([
        assignmentIds.length
            ? supabase
                  .from('assignment_submissions')
                  .select('assignment_id, student_id, score')
                  .in('assignment_id', assignmentIds)
            : Promise.resolve({ data: [] as any[] }),
        quizIds.length
            ? supabase
                  .from('quiz_attempts')
                  .select('quiz_id, student_id, score')
                  .in('quiz_id', quizIds)
                  .eq('status', 'graded')
            : Promise.resolve({ data: [] as any[] }),
    ])

    const scores: GradebookData['scores'] = [
        ...(submissions ?? []).map((s: any) => ({
            columnId: s.assignment_id as string,
            studentId: s.student_id as string,
            score: s.score as number | null,
        })),
        ...(attempts ?? []).map((a: any) => ({
            columnId: a.quiz_id as string,
            studentId: a.student_id as string,
            score: a.score as number | null,
        })),
    ]

    return { students, columns, scores }
}
