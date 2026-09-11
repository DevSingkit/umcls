// See lib/auth/AUTH_NOTES.md for why these checks exist.
//
// getMyTodoItems reads student_todo_items (migration 038) — unchanged
// from before, still correctly gives "Assigned"/"Missing" candidates
// (anything NOT yet submitted; the view's own exclude-completed
// migration, 068, is exactly right for this half of the picture).
//
// getMyDoneItems is new: confirmed against real Google Classroom
// behavior (not assumed) that "Done" means TURNED IN, not "graded" —
// Classroom shows "Turned in" for an ungraded-but-submitted item, and
// only shows a score once the teacher has released it. So this reads
// directly from assignment_submissions/quiz_attempts (any status that
// means "the student did something"), not from a completed/graded
// filter, and the view's exclusion of these rows is exactly why this
// needs its own query rather than reusing student_todo_items at all.

import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type TodoItem = {
    id: string
    itemType: 'assignment' | 'quiz'
    title: string
    courseId: string
    dueAt: string | null
}

export async function getMyTodoItems(): Promise<TodoItem[]> {
    await requireRole(['student'])
    const user = await getCurrentUser()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('student_todo_items')
        .select('id, item_type, title, course_id, due_at, created_at')
        .order('created_at', { ascending: false })

    if (error || !data) {
        return []
    }

    return data.map((row) => ({
        id: row.id,
        itemType: row.item_type as 'assignment' | 'quiz',
        title: row.title,
        courseId: row.course_id,
        dueAt: row.due_at,
    }))
}

export type DoneItem = {
    id: string
    itemType: 'assignment' | 'quiz'
    title: string
    courseId: string
    submittedAt: string
    // Matches real Classroom: "turned_in" shows as "Turned in" (no
    // score yet, whether or not a teacher has started grading —
    // assignments: status 'submitted'/'resubmitted'; quizzes: status
    // 'submitted' with no score). "graded" shows the actual score —
    // assignments: status 'graded'/'returned'; quizzes: status
    // 'graded'.
    status: 'turned_in' | 'graded'
    score: number | null
    maxScore: number
}

export async function getMyDoneItems(): Promise<DoneItem[]> {
    await requireRole(['student'])
    const user = await getCurrentUser()
    const supabase = await createClient()

    const [{ data: submissions }, { data: attempts }] = await Promise.all([
        supabase
            .from('assignment_submissions')
            .select('id, status, score, submitted_at, assignment_id, assignments!inner(title, course_id, max_score)')
            .eq('student_id', user!.id)
            .order('submitted_at', { ascending: false }),
        supabase
            .from('quiz_attempts')
            .select('id, status, score, submitted_at, quiz_id, quizzes!inner(title, course_id, questions(points))')
            .eq('student_id', user!.id)
            .in('status', ['submitted', 'graded'])
            .order('submitted_at', { ascending: false }),
    ])

    const assignmentItems: DoneItem[] = (submissions ?? []).map((s: any) => ({
        id: s.assignment_id as string,
        itemType: 'assignment' as const,
        title: s.assignments?.title ?? 'Assignment',
        courseId: s.assignments?.course_id as string,
        submittedAt: s.submitted_at,
        status: s.status === 'graded' || s.status === 'returned' ? 'graded' : 'turned_in',
        score: s.status === 'graded' || s.status === 'returned' ? s.score : null,
        maxScore: s.assignments?.max_score ?? 100,
    }))

    const quizItems: DoneItem[] = (attempts ?? []).map((a: any) => ({
        id: a.quiz_id as string,
        itemType: 'quiz' as const,
        title: a.quizzes?.title ?? 'Quiz',
        courseId: a.quizzes?.course_id as string,
        submittedAt: a.submitted_at,
        status: a.status === 'graded' ? 'graded' : 'turned_in',
        score: a.status === 'graded' ? a.score : null,
        maxScore: (a.quizzes?.questions ?? []).reduce((sum: number, q: any) => sum + (q.points ?? 0), 0),
    }))

    return [...assignmentItems, ...quizItems].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )
}
