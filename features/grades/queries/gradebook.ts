// See lib/auth/AUTH_NOTES.md for why these checks exist.
//
// This intentionally does NOT read or write the `grades` table.
// DATABASE.md defines assignment_average/quiz_average/overall_grade on
// `grades`, meant to be maintained by computeRunningAverage() — but that
// function was never implemented, so `grades` has no populated write
// path anywhere in the codebase. Rather than build on top of a table
// nobody writes to, this computes assignment and quiz averages live
// from assignment_submissions and quiz_attempts. See the note added to
// TASKS.md for the deferred decision on combining these into a single
// overall_grade (weighting policy, letter grade scale) — out of scope
// here on purpose.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type GradebookRow = {
    studentId: string
    studentName: string
    lessonsCompleted: number
    totalLessons: number
    assignmentAverage: number | null // 0-100, normalized per assignment's max_score
    assignmentCount: number
    quizAverage: number | null // 0-100
    quizCount: number
}

export async function getGradebookForCourse(courseId: string): Promise<GradebookRow[] | null> {
    return getGradebookForCourseInRange(courseId, null, null)
}

export async function getGradebookForCourseInRange(
    courseId: string,
    from: string | null,
    to: string | null
): Promise<GradebookRow[] | null> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) return null

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active')

    const students = (enrollments ?? []).map((e: any) => ({
        studentId: e.student_id as string,
        studentName: (e.users?.full_name as string) ?? 'Unknown',
    }))

    if (students.length === 0) return []

    // Lessons completed vs total published lessons in the course.
    const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .is('deleted_at', null)

    const lessonIds = (lessons ?? []).map((l) => l.id)
    const totalLessons = lessonIds.length

    const { data: completions } = lessonIds.length
        ? await supabase
            .from('lesson_completions')
            .select('student_id, lesson_id')
            .in('lesson_id', lessonIds)
        : { data: [] as { student_id: string; lesson_id: string }[] }

    const completionsByStudent = new Map<string, number>()
    for (const c of completions ?? []) {
        completionsByStudent.set(c.student_id, (completionsByStudent.get(c.student_id) ?? 0) + 1)
    }

    // Assignment average — normalized to a 0-100 percentage per
    // assignment (max_score varies per assignment), then averaged
    // across every graded/returned submission for that student.
    const { data: assignments } = await supabase
        .from('assignments')
        .select('id, max_score')
        .eq('course_id', courseId)
        .is('deleted_at', null)

    const maxScoreByAssignment = new Map((assignments ?? []).map((a) => [a.id, a.max_score]))
    const assignmentIds = (assignments ?? []).map((a) => a.id)

    let submissionsQuery = supabase
        .from('assignment_submissions')
        .select('student_id, assignment_id, score, status')
        .in('assignment_id', assignmentIds)
        .in('status', ['graded', 'returned'])

    if (from) submissionsQuery = submissionsQuery.gte('graded_at', from)
    if (to) submissionsQuery = submissionsQuery.lte('graded_at', to)

    const { data: submissions } = assignmentIds.length
        ? await submissionsQuery
        : { data: [] as { student_id: string; assignment_id: string; score: number | null; status: string }[] }

    const assignmentPercentagesByStudent = new Map<string, number[]>()
    for (const s of submissions ?? []) {
        if (s.score === null) continue
        const maxScore = maxScoreByAssignment.get(s.assignment_id) ?? 100
        const pct = maxScore > 0 ? (s.score / maxScore) * 100 : 0
        const list = assignmentPercentagesByStudent.get(s.student_id) ?? []
        list.push(pct)
        assignmentPercentagesByStudent.set(s.student_id, list)
    }

    // Quiz average — quiz_attempts.score is already stored 0-100 (see
    // grade-quiz-submission.ts / grade-short-answer.ts), so no
    // normalization needed here, just average across graded attempts.
    const { data: quizzes } = await supabase.from('quizzes').select('id').eq('course_id', courseId)
    const quizIds = (quizzes ?? []).map((q) => q.id)

    let attemptsQuery = supabase
        .from('quiz_attempts')
        .select('student_id, score, status')
        .in('quiz_id', quizIds)
        .eq('status', 'graded')

    if (from) attemptsQuery = attemptsQuery.gte('graded_at', from)
    if (to) attemptsQuery = attemptsQuery.lte('graded_at', to)

    const { data: attempts } = quizIds.length
        ? await attemptsQuery
        : { data: [] as { student_id: string; score: number | null; status: string }[] }

    const quizScoresByStudent = new Map<string, number[]>()
    for (const a of attempts ?? []) {
        if (a.score === null) continue
        const list = quizScoresByStudent.get(a.student_id) ?? []
        list.push(a.score)
        quizScoresByStudent.set(a.student_id, list)
    }

    function average(values: number[]): number | null {
        if (values.length === 0) return null
        return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
    }

    return students.map((student) => {
        const assignmentPcts = assignmentPercentagesByStudent.get(student.studentId) ?? []
        const quizScores = quizScoresByStudent.get(student.studentId) ?? []
        return {
            studentId: student.studentId,
            studentName: student.studentName,
            lessonsCompleted: completionsByStudent.get(student.studentId) ?? 0,
            totalLessons,
            assignmentAverage: average(assignmentPcts),
            assignmentCount: assignmentPcts.length,
            quizAverage: average(quizScores),
            quizCount: quizScores.length,
        }
    })
}
export type HeatmapStatus = 'graded' | 'returned' | 'submitted' | 'late' | 'missing' | 'not_due'

export type AssignmentHeatmap = {
    assignments: { id: string; title: string }[]
    students: { id: string; name: string }[]
    // Keyed as "studentId:assignmentId" for easy lookup in the grid.
    cells: Record<string, HeatmapStatus>
}

// Student × assignment status grid. One cell per pair: graded/returned
// if scored, submitted if turned in but ungraded, late if turned in
// past due_at, missing if due_at has passed with nothing submitted, or
// not_due if the deadline (or an undated assignment) hasn't passed yet.
export async function getAssignmentHeatmapForCourse(courseId: string): Promise<AssignmentHeatmap | null> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) return null

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active')

    const students = (enrollments ?? []).map((e: any) => ({
        id: e.student_id as string,
        name: (e.users?.full_name as string) ?? 'Unknown',
    }))

    const { data: assignmentRows } = await supabase
        .from('assignments')
        .select('id, title, due_at')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

    const assignments = (assignmentRows ?? []).map((a) => ({ id: a.id, title: a.title }))
    const assignmentIds = assignments.map((a) => a.id)
    const dueAtByAssignment = new Map((assignmentRows ?? []).map((a) => [a.id, a.due_at]))

    const { data: submissions } = assignmentIds.length
        ? await supabase
            .from('assignment_submissions')
            .select('student_id, assignment_id, status, is_late')
            .in('assignment_id', assignmentIds)
        : { data: [] as { student_id: string; assignment_id: string; status: string; is_late: boolean }[] }

    const submissionByKey = new Map((submissions ?? []).map((s) => [`${s.student_id}:${s.assignment_id}`, s]))

    const now = new Date()
    const cells: Record<string, HeatmapStatus> = {}

    for (const student of students) {
        for (const assignment of assignments) {
            const key = `${student.id}:${assignment.id}`
            const submission = submissionByKey.get(key)

            if (submission) {
                if (submission.is_late) {
                    cells[key] = 'late'
                } else if (submission.status === 'graded') {
                    cells[key] = 'graded'
                } else if (submission.status === 'returned') {
                    cells[key] = 'returned'
                } else {
                    cells[key] = 'submitted'
                }
                continue
            }

            const dueAt = dueAtByAssignment.get(assignment.id)
            cells[key] = dueAt && now > new Date(dueAt) ? 'missing' : 'not_due'
        }
    }

    return { assignments, students, cells }
}