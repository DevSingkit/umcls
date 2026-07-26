'use server'
// GDPR Right-to-Erasure (PH2-SEC-01). Turns GDPR_ERASURE_RUNBOOK.md's
// four manual steps into one action, so an admin clicks a button
// instead of running SQL and Admin API calls by hand.
//
// This is anonymization, not full row deletion, matching SECURITY.md
// §8.2: academic records (quiz scores, lesson completions) stay, keyed
// to the now-anonymized user id. Only personally identifying fields
// are scrubbed. Audit log entries about this user also stay, per the
// runbook's "what is intentionally not deleted" section.
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type EraseUserResult = { ok: true } | { ok: false; error: string }

export async function eraseUser(userId: string): Promise<EraseUserResult> {
    // Only an admin can do this, checked before touching anything.
    await requireRole(['admin'])

    if (!userId) {
        return { ok: false, error: 'No user was specified.' }
    }

    const supabaseAdmin = createAdminClient()
    const supabase = await createClient()

    // An admin should never be able to erase their own account this
    // way. That would lock them out mid-action and leaves no clean way
    // to confirm the request was legitimate.
    const { data: caller } = await supabase.auth.getUser()
    if (caller.user?.id === userId) {
        return { ok: false, error: 'You cannot erase your own account.' }
    }

    // Step 1: anonymize the users row. Runbook's exact placeholder
    // pattern, so an anonymized row is always recognizable at a glance.
    const { error: anonymizeError } = await supabaseAdmin
        .from('users')
        .update({
            full_name: `Deleted User ${userId.slice(0, 8)}`,
            email: `deleted_${userId}@erased.invalid`,
            avatar_url: null,
            metadata: {},
            deleted_at: new Date().toISOString(),
        })
        .eq('id', userId)

    if (anonymizeError) {
        return { ok: false, error: 'Could not anonymize this account. Nothing else was changed.' }
    }

    // Step 2: delete the Supabase Auth login. No SQL equivalent, this
    // must go through the Admin API.
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
        // The users row is already anonymized at this point. We don't
        // attempt to undo that: a partially-anonymized-but-still-
        // logged-in-able account is a worse state than an anonymized
        // account whose login deletion needs a retry.
        return {
            ok: false,
            error:
                'The account details were anonymized, but deleting the login itself failed. Please try again or check manually.',
        }
    }

    // Step 3: remove any submission files. Usually a no-op in V1 since
    // Assignments/Materials haven't shipped yet, but run it anyway so
    // this doesn't silently miss files once those features exist.
    const { data: submissions } = await supabaseAdmin
        .from('assignment_submissions')
        .select('file_path')
        .eq('student_id', userId)

    for (const submission of submissions ?? []) {
        if (submission.file_path) {
            await supabaseAdmin.storage.from('submissions').remove([submission.file_path])
        }
    }

    // Step 4: audit log entry. Uses the regular client so
    // log_audit_event correctly records the acting admin via
    // auth.uid(), same pattern as every other action in this project.
    await supabase.rpc('log_audit_event', {
        p_action: 'USER_GDPR_ERASED',
        p_target_table: 'users',
        p_target_id: userId,
        p_metadata: { method: 'admin_ui' },
    })

    return { ok: true }
}
