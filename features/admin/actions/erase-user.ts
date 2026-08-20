'use server'
// 2026-08-17 — REWORKED per explicit requirement: nothing in this app
// permanently destroys data anymore. Every delete/erase action must be
// reversible from the admin Archives page. This used to be a genuine
// GDPR-style anonymization (scrub full_name/email, delete the Auth
// login) — that is intentionally removed. eraseUser now does exactly
// what archiveCourse does in course-management.ts: it sets a
// deleted_at timestamp and nothing else. All of the person's real
// data — name, email, login, academic records — stays completely
// intact and is fully restored by restoreUser.
//
// Function names (eraseUser) and the UI label ("Erase User Data") are
// kept as-is on purpose — the *behavior* changed, not what the button
// says, so nothing calling this needs to change and the day-to-day
// experience for the admin stays familiar. The confirmation copy in
// EraseUserModal.tsx was updated to honestly describe this as
// recoverable via Archives, since it no longer is permanent.
//
// IMPORTANT — this file no longer satisfies GDPR-style "right to
// erasure" in the sense the old comment described (real anonymization
// + login deletion). If there's ever a genuine legal erasure request,
// that would need a different, actually-permanent action — this one
// is deliberately just a soft delete now.
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type EraseUserResult = { ok: true } | { ok: false; error: string }

export async function eraseUser(userId: string): Promise<EraseUserResult> {
    await requireRole(['admin'])

    if (!userId) {
        return { ok: false, error: 'No user was specified.' }
    }

    const supabase = await createClient()

    // An admin should never be able to "delete" their own account this
    // way — same guard as before, still relevant even though this is
    // now reversible, since it would still sign them out mid-action.
    const { data: caller } = await supabase.auth.getUser()
    if (caller.user?.id === userId) {
        return { ok: false, error: 'You cannot delete your own account.' }
    }

    // Soft delete only — same shape as archiveCourse in
    // course-management.ts. No anonymization, no Auth deletion. Name,
    // email, and login all stay exactly as they were; deleted_at is
    // the only thing that changes.
    const { data, error } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', userId)
        .select('id')

    if (error) {
        return { ok: false, error: 'Could not delete this account. Nothing was changed.' }
    }
    // update() reports error: null even if RLS silently filtered every
    // row — confirm a row actually came back rather than trusting the
    // absence of an error alone (same defensive check as
    // deactivateUser/archiveCourse).
    if (!data || data.length === 0) {
        return { ok: false, error: 'The account was not updated. You may not have permission to change it.' }
    }

    await supabase.rpc('log_audit_event', {
        p_action: 'USER_DELETED',
        p_target_table: 'users',
        p_target_id: userId,
        p_metadata: { method: 'admin_ui', reversible: true },
    })

    return { ok: true }
}

export async function restoreUser(userId: string): Promise<EraseUserResult> {
    await requireRole(['admin'])

    if (!userId) {
        return { ok: false, error: 'No user was specified.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('users')
        .update({ deleted_at: null })
        .eq('id', userId)
        .select('id')

    if (error) {
        return { ok: false, error: 'Could not restore this account.' }
    }
    if (!data || data.length === 0) {
        return { ok: false, error: 'The account was not updated. You may not have permission to change it.' }
    }

    await supabase.rpc('log_audit_event', {
        p_action: 'USER_RESTORED',
        p_target_table: 'users',
        p_target_id: userId,
    })

    return { ok: true }
}
