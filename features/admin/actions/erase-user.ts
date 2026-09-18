'use server'

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type EraseUserResult = { ok: true } | { ok: false; error: string }

export async function eraseUser(userId: string): Promise<EraseUserResult> {
    await requireRole(['admin'])

    if (!userId) {
        return { ok: false, error: 'No user was specified.' }
    }

    // NEW
const supabase = await createClient()
const adminClient = createAdminClient()

const { data: caller } = await supabase.auth.getUser()
if (caller.user?.id === userId) {
    return { ok: false, error: 'You cannot delete your own account.' }
}

const { error } = await adminClient
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId)

if (error) {
    console.error('eraseUser update failed:', error.message, error.code, error.details)
    return { ok: false, error: 'Could not delete this account. Nothing was changed.' }
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
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
        .from('users')
        .update({ deleted_at: null })
        .eq('id', userId)
        .select('id')

    if (error) {
        console.error('restoreUser update failed:', error.message, error.code, error.details)
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
