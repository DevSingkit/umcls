'use server'
// Admin-only course archiving. Archiving/unarchiving is deliberately
// NOT exposed to teachers — see migration 059's own comment for why.
// This reuses the existing courses_update RLS policy (already allows
// auth_role() = 'admin' to update any course, same as course
// reassignment in features/admin/actions/users.ts's
// assignCourseTeacher) — no new RPC needed, archived_at is just
// another column an admin can set.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type AdminCourseListRow = {
    id: string
    title: string
    subject: string | null
    teacherName: string
    isArchived: boolean
}

// Every course, any teacher, archived or not — the admin management
// list needs to show both states so an admin can toggle either
// direction from one place.
export async function getAllCoursesForManagement(): Promise<AdminCourseListRow[]> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data } = await supabase
        .from('courses')
        .select('id, title, subject, archived_at, users!courses_teacher_id_fkey(full_name)')
        .is('deleted_at', null)
        .order('title', { ascending: true })

    return (data ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
        teacherName: c.users?.full_name ?? 'Unknown',
        isArchived: c.archived_at !== null,
    }))
}

export type ArchiveCourseResult = { ok: true } | { ok: false; error: string }

export async function archiveCourse(courseId: string): Promise<ArchiveCourseResult> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('courses')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', courseId)
        .select('id')

    if (error) {
        return { ok: false, error: 'Could not archive the course.' }
    }
    // Same defensive check as the deactivateUser fix — an update() call
    // reports error: null even if RLS silently filtered every row, so
    // confirm a row actually came back rather than trusting the
    // absence of an error alone.
    if (!data || data.length === 0) {
        return { ok: false, error: 'The course was not updated. You may not have permission to change it.' }
    }

    await supabase.rpc('log_audit_event', {
        p_action: 'COURSE_ARCHIVED',
        p_target_table: 'courses',
        p_target_id: courseId,
    })

    return { ok: true }
}

export async function unarchiveCourse(courseId: string): Promise<ArchiveCourseResult> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('courses')
        .update({ archived_at: null })
        .eq('id', courseId)
        .select('id')

    if (error) {
        return { ok: false, error: 'Could not unarchive the course.' }
    }
    if (!data || data.length === 0) {
        return { ok: false, error: 'The course was not updated. You may not have permission to change it.' }
    }

    await supabase.rpc('log_audit_event', {
        p_action: 'COURSE_UNARCHIVED',
        p_target_table: 'courses',
        p_target_id: courseId,
    })

    return { ok: true }
}
