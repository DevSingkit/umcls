'use server'
// Soft-deletes a lesson, quiz, or assignment from the course stream.
// Uses per-type SECURITY DEFINER RPCs (migration 048) instead of a
// direct table UPDATE — the *_update RLS policies' WITH CHECK reject
// this UPDATE even for the verified owning teacher, same issue
// documented in materials.ts around delete_material (migration 036).
// The RPC does its own ownership check explicitly in SQL before
// touching anything, so this is not a security downgrade — just a
// workaround for the RLS bug, same reasoning as materials.ts.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import type { TeacherStreamItemType } from '@/features/courses/actions/get-teacher-course-stream'

const RPC_BY_TYPE: Record<TeacherStreamItemType, string> = {
    lesson: 'delete_lesson',
    quiz: 'delete_quiz',
    assignment: 'delete_assignment',
}

const PARAM_BY_TYPE: Record<TeacherStreamItemType, string> = {
    lesson: 'p_lesson_id',
    quiz: 'p_quiz_id',
    assignment: 'p_assignment_id',
}

export type DeleteStreamItemResult = { ok: true } | { ok: false; error: string }

export async function deleteStreamItem(
    type: TeacherStreamItemType,
    itemId: string
): Promise<DeleteStreamItemResult> {
    // requireRole still runs first, even though the RPC re-checks
    // ownership itself — same double-check pattern as AUTH_NOTES.md
    // everywhere else, not relying on the RPC alone.
    await requireRole(['teacher'])
    const supabase = await createClient()

    const rpcName = RPC_BY_TYPE[type]
    const paramName = PARAM_BY_TYPE[type]

    const { data: deleted, error } = await supabase.rpc(rpcName, { [paramName]: itemId })

    if (error) {
        return { ok: false, error: `Could not delete: ${error.message}` }
    }

    if (!deleted) {
        return { ok: false, error: 'You do not have permission to delete this.' }
    }

    return { ok: true }
}
