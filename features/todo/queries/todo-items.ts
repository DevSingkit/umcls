// See lib/auth/AUTH_NOTES.md for why these checks exist.
//
// Reads student_todo_items (migration 038, DATABASE.md §11.7) — a
// union of published assignments + published quizzes only. Lessons and
// materials never appear here by design (PRD FR-STU-01 / US-036); the
// view itself enforces this, this query just reads it.
//
// The view has no RLS of its own (views don't carry row security
// unless created with security_invoker) — it's safe because the
// underlying assignments/quizzes tables already scope student access
// to published, enrolled-course rows via their own RLS policies.

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

    // student_todo_items has no student-specific column to filter on —
    // it's scoped down to only-enrolled-course rows automatically via
    // the underlying assignments/quizzes RLS, since this query runs as
    // the logged-in student's own session.
    const { data, error } = await supabase
        .from('student_todo_items')
        .select('id, item_type, title, course_id, due_at')
        .order('due_at', { ascending: true, nullsFirst: false })

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