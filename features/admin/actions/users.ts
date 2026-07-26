'use server'
// Full admin user management (PH2-002), extending create-user.ts with
// everything else the task describes: deactivate/reactivate, password
// reset, a searchable/filterable list, and assigning/reassigning a
// teacher to a course. See lib/auth/AUTH_NOTES.md for why requireRole
// is checked first in every action here.
import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { forceSignOutUser } from '@/lib/security/guards'

export type UserRow = {
    id: string
    full_name: string
    email: string
    role: 'admin' | 'teacher' | 'student'
    is_active: boolean
    created_at: string
}

// Returns users matching the given search/role/status filters, for the
// admin user list. This is the real searchable list from PH2-002's full
// acceptance criteria (not the "plain list, Ctrl+F is fine" placeholder
// that was written for the earlier V1-trimmed scope).
export async function listUsers(params: {
    search?: string
    role?: 'admin' | 'teacher' | 'student' | 'all'
    status?: 'active' | 'inactive' | 'all'
}): Promise<UserRow[]> {
    await requireRole(['admin'])
    const supabase = await createClient()

    let query = supabase
        .from('users')
        .select('id, full_name, email, role, is_active, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (params.role && params.role !== 'all') {
        query = query.eq('role', params.role)
    }
    if (params.status && params.status !== 'all') {
        query = query.eq('is_active', params.status === 'active')
    }
    if (params.search) {
        const term = params.search.replace(/[%_]/g, '')
        query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
    }

    const { data } = await query
    return data ?? []
}

export type ToggleActiveResult = { ok: true } | { ok: false; error: string }

// Deactivates a user: sets is_active = false and immediately forces
// every active session for that user to end, everywhere. is_active
// checked at requireUser/requireRole would eventually catch this too,
// but forceSignOutUser makes it happen right now instead of on their
// next request. guards.ts's own comment flagged this as unwired to
// anything yet — this is that missing caller.
export async function deactivateUser(userId: string): Promise<ToggleActiveResult> {
    const admin = await requireRole(['admin'])

    if (!z.string().uuid().safeParse(userId).success) {
        return { ok: false, error: 'Invalid user.' }
    }
    if (userId === admin.id) {
        return { ok: false, error: 'You cannot deactivate your own account.' }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('users').update({ is_active: false }).eq('id', userId)

    if (error) {
        return { ok: false, error: 'Could not deactivate the account.' }
    }

    await forceSignOutUser(userId)
    await supabase.rpc('log_audit_event', {
        p_action: 'USER_DEACTIVATED',
        p_target_table: 'users',
        p_target_id: userId,
    })

    return { ok: true }
}

// Reactivates a previously deactivated user.
export async function reactivateUser(userId: string): Promise<ToggleActiveResult> {
    await requireRole(['admin'])

    if (!z.string().uuid().safeParse(userId).success) {
        return { ok: false, error: 'Invalid user.' }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('users').update({ is_active: true }).eq('id', userId)

    if (error) {
        return { ok: false, error: 'Could not reactivate the account.' }
    }

    await supabase.rpc('log_audit_event', {
        p_action: 'USER_REACTIVATED',
        p_target_table: 'users',
        p_target_id: userId,
    })

    return { ok: true }
}

const resetPasswordSchema = z.object({
    userId: z.string().uuid(),
    newPassword: z
        .string()
        .min(12, 'Password must be at least 12 characters')
        .regex(/[a-z]/, 'Password needs a lowercase letter')
        .regex(/[A-Z]/, 'Password needs an uppercase letter')
        .regex(/[0-9]/, 'Password needs a number'),
})

export type ResetPasswordResult = { ok: true } | { ok: false; error: string }

// Admin sets a new temporary password directly — e.g. a student is
// locked out and can't use forgot-password themselves. Uses the
// service-role admin client, same reasoning as createUser.
export async function resetUserPassword(formData: FormData): Promise<ResetPasswordResult> {
    await requireRole(['admin'])

    const parsed = resetPasswordSchema.safeParse({
        userId: formData.get('userId'),
        newPassword: formData.get('newPassword'),
    })
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { userId, newPassword } = parsed.data
    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
    })

    if (error) {
        return { ok: false, error: 'Could not reset the password.' }
    }

    const supabase = await createClient()
    await supabase.rpc('log_audit_event', {
        p_action: 'USER_PASSWORD_RESET',
        p_target_table: 'users',
        p_target_id: userId,
    })

    return { ok: true }
}

const assignTeacherSchema = z.object({
    courseId: z.string().uuid(),
    teacherId: z.string().uuid(),
})

export type AssignTeacherResult = { ok: true } | { ok: false; error: string }

// Reassigns which teacher owns a course (FR-ADMIN-10 / US-010).
// courses_update's RLS policy already allows an admin to update any
// course, so this is a straightforward update once the role check
// above passes.
export async function assignCourseTeacher(formData: FormData): Promise<AssignTeacherResult> {
    await requireRole(['admin'])

    const parsed = assignTeacherSchema.safeParse({
        courseId: formData.get('courseId'),
        teacherId: formData.get('teacherId'),
    })
    if (!parsed.success) {
        return { ok: false, error: 'Please choose a course and a teacher.' }
    }

    const { courseId, teacherId } = parsed.data
    const supabase = await createClient()

    const { error } = await supabase.from('courses').update({ teacher_id: teacherId }).eq('id', courseId)

    if (error) {
        return { ok: false, error: 'Could not reassign the course.' }
    }

    await supabase.rpc('log_audit_event', {
        p_action: 'COURSE_TEACHER_REASSIGNED',
        p_target_table: 'courses',
        p_target_id: courseId,
        p_metadata: { new_teacher_id: teacherId },
    })

    return { ok: true }
}

// Every active teacher, for the reassignment dropdown.
export async function getAllTeachers() {
    await requireRole(['admin'])
    const supabase = await createClient()
    const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('full_name')
    return data ?? []
}

// Every course with its current teacher's name, for the reassignment list.
export async function getAllCoursesWithTeacher() {
    await requireRole(['admin'])
    const supabase = await createClient()
    const { data } = await supabase
        .from('courses')
        .select('id, title, teacher_id, teacher:users!courses_teacher_id_fkey(full_name)')
        .is('deleted_at', null)
        .order('title')
    return (data ?? []).map((course: any) => ({
        id: course.id,
        title: course.title,
        teacherId: course.teacher_id,
        teacherName: course.teacher?.full_name ?? 'Unknown',
    }))
}
