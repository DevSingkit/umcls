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
    const { data, error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId)
        .select('id')

    if (error) {
        console.error('deactivateUser update failed:', error.message, error.code, error.details)
        return { ok: false, error: 'Could not deactivate the account.' }
    }

    // A Supabase update() call reports error: null even when RLS's
    // USING clause silently filters out every row — 0 rows changed
    // looks identical to success unless we ask for the row back and
    // check it actually came back. Same failure mode already
    // documented for toggle_assignment_publish in SECURITY.md §3;
    // this is the same class of bug on a different table.
    if (!data || data.length === 0) {
        return { ok: false, error: 'The account was not updated. You may not have permission to change this user.' }
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
    const { data, error } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', userId)
        .select('id')

    if (error) {
        return { ok: false, error: 'Could not reactivate the account.' }
    }

    if (!data || data.length === 0) {
        return { ok: false, error: 'The account was not updated. You may not have permission to change this user.' }
    }

    await supabase.rpc('log_audit_event', {
        p_action: 'USER_REACTIVATED',
        p_target_table: 'users',
        p_target_id: userId,
    })

    return { ok: true }
}

// Every deleted user, for the Archives page's "Deleted accounts"
// section — mirrors getAllCoursesForManagement's shape in
// course-management.ts exactly. Only deleted_at IS NOT NULL rows: this
// is specifically the recovery list, not the main user list (that's
// listUsers above, which excludes these).
export type ArchivedUserRow = {
    id: string
    full_name: string
    email: string
    role: 'admin' | 'teacher' | 'student'
    deletedAt: string
}

export async function getAllDeletedUsers(): Promise<ArchivedUserRow[]> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

    return (data ?? []).map((u) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        deletedAt: u.deleted_at as string,
    }))
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

const updateUserProfileSchema = z.object({
    userId: z.string().uuid(),
    fullName: z.string().min(2, 'Name is too short'),
    email: z.string().email('Enter a valid email'),
})

export type UpdateUserProfileResult = { ok: true } | { ok: false; error: string }

// Edits a user's name/email. Email is the login identity in Supabase
// Auth, not just a public.users column — updating it here must go
// through the admin auth API (createAdminClient), same reasoning
// createUser and resetUserPassword already use a service-role client
// for anything touching auth.users, not just public.users. The
// full_name update to public.users is a normal client call, no
// elevated privilege needed for that half.
export async function updateUserProfile(formData: FormData): Promise<UpdateUserProfileResult> {
    const admin = await requireRole(['admin'])

    const parsed = updateUserProfileSchema.safeParse({
        userId: formData.get('userId'),
        fullName: formData.get('fullName'),
        email: formData.get('email'),
    })
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const { userId, fullName, email } = parsed.data
    const supabaseAdmin = createAdminClient()

    // Update the auth.users email first — if this fails (e.g. email
    // already in use by another account), nothing in public.users has
    // changed yet, so there's no partial/inconsistent state to clean up.
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email })
    if (authError) {
        return { ok: false, error: authError.message || 'Could not update the email address.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('users')
        .update({ full_name: fullName, email })
        .eq('id', userId)

    if (error) {
        return { ok: false, error: 'Email was updated, but the profile name could not be saved. Please try again.' }
    }

    await supabase.rpc('log_audit_event', {
        p_action: 'USER_PROFILE_UPDATED',
        p_target_table: 'users',
        p_target_id: userId,
        p_metadata: { updated_by: admin.id },
    })

    return { ok: true }
}

export type RoleChangeEligibility =
    | { eligible: true }
    | { eligible: false; reason: string }

// Checked before showing (or before accepting a submit of) the change
// role control. Deliberately conservative: a role change is only
// allowed when the user has ZERO data tied to their CURRENT role —
// no orphaned courses, no dangling submissions/attempts, no
// grade history left behind with nothing pointing at it. This is a
// blunt rule on purpose. A softer one (warn but allow anyway, or try
// to migrate/reassign the data automatically) was considered and
// rejected — see HANDOFF.md for the reasoning. If a teacher has taught
// courses or a student has real submitted work, their role is
// effectively permanent in this app; the fix path is to create a new
// account with the new role, not to flip this one.
export async function getUserRoleChangeEligibility(userId: string): Promise<RoleChangeEligibility> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data: user } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .single()

    if (!user) {
        return { eligible: false, reason: 'User not found.' }
    }

    if (user.role === 'teacher') {
        const { count } = await supabase
            .from('courses')
            .select('id', { count: 'exact', head: true })
            .eq('teacher_id', userId)
            .is('deleted_at', null)

        if ((count ?? 0) > 0) {
            return {
                eligible: false,
                reason: `This teacher owns ${count} course${count === 1 ? '' : 's'}. Reassign or archive ${count === 1 ? 'it' : 'them'} first, then the role can be changed.`,
            }
        }
    }

    if (user.role === 'student') {
        const [{ count: submissionCount }, { count: attemptCount }, { count: enrollmentCount }] = await Promise.all([
            supabase
                .from('assignment_submissions')
                .select('id', { count: 'exact', head: true })
                .eq('student_id', userId),
            supabase
                .from('quiz_attempts')
                .select('id', { count: 'exact', head: true })
                .eq('student_id', userId),
            supabase
                .from('enrollments')
                .select('id', { count: 'exact', head: true })
                .eq('student_id', userId)
                .eq('status', 'active'),
        ])

        const total = (submissionCount ?? 0) + (attemptCount ?? 0) + (enrollmentCount ?? 0)
        if (total > 0) {
            return {
                eligible: false,
                reason: 'This student has enrollments or submitted work. Their role cannot be changed while that history exists.',
            }
        }
    }

    // Admins own no courses/submissions directly, so there's no data
    // check to run for them the way there is for teacher/student — but
    // that must not mean "always eligible with no guard at all." The
    // one real risk here is demoting the last remaining admin, which
    // would lock the whole school out of admin functions with no way
    // back in short of a direct database fix. Checked here rather than
    // only in changeUserRole, so getUserRoleChangeEligibility (used to
    // decide whether to even show the control) reflects this too.
    if (user.role === 'admin') {
        const { count: otherActiveAdmins } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'admin')
            .eq('is_active', true)
            .is('deleted_at', null)
            .neq('id', userId)

        if ((otherActiveAdmins ?? 0) === 0) {
            return {
                eligible: false,
                reason: 'This is the only active admin account. Create another admin account first before changing this one\u2019s role.',
            }
        }
    }

    return { eligible: true }
}

export type ChangeUserRoleResult = { ok: true } | { ok: false; error: string }

// Actually changes the role — always re-checks eligibility itself
// rather than trusting a prior getUserRoleChangeEligibility call from
// the client, since data could have changed in between (e.g. admin
// opened the dialog, then in another tab created a course for that
// teacher before submitting here).
export async function changeUserRole(
    userId: string,
    newRole: 'admin' | 'teacher' | 'student'
): Promise<ChangeUserRoleResult> {
    const admin = await requireRole(['admin'])

    if (userId === admin.id) {
        return { ok: false, error: 'You cannot change your own role.' }
    }

    const eligibility = await getUserRoleChangeEligibility(userId)
    if (!eligibility.eligible) {
        return { ok: false, error: eligibility.reason }
    }

    const supabase = await createClient()
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single()
    const oldRole = user?.role ?? 'unknown'

    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId)

    if (error) {
        return { ok: false, error: 'Could not change the role. Please try again.' }
    }

    // Role changes take effect immediately at the RLS layer
    // (auth_role() reads role directly) — forcing a sign-out here means
    // the user's next request re-authenticates cleanly under the new
    // role, rather than continuing on a stale session that assumed the
    // old one. Same reasoning as deactivateUser's forceSignOutUser call.
    await forceSignOutUser(userId)

    await supabase.rpc('log_audit_event', {
        p_action: 'USER_ROLE_CHANGED',
        p_target_table: 'users',
        p_target_id: userId,
        p_metadata: { old_role: oldRole, new_role: newRole, changed_by: admin.id },
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
