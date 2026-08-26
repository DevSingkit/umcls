'use server'
// Backing query for the admin user backup route (app/api/admin/backup/
// users). Kept separate from admin-grades.ts/users.ts because it's
// shaped for a full-record export, not for rendering a UI.
//
// The gradebook-scores and final-grade backup functions that used to
// live in this file (getAllGradebookScoresForBackup,
// getAllFinalGradesForBackup) have been removed, not rewritten — both
// read gradebook_items/gradebook_scores/subject_weight_profiles, all
// dropped in migration 083 along with the DepEd-weighted grading
// system and the "Final Grade" concept itself. There's currently no
// replacement grades backup — per product decision, rebuild later if
// actually needed, sourced from assignment_submissions/quiz_attempts
// directly (same source gradebook.ts already reads for the live
// gradebook view), with no Final Grade column since nothing computes
// one anymore.
//
// Not a 'use server' Server Action in the strict form-action sense —
// called directly from a Route Handler (see AUTH_NOTES.md / the old
// gradebook export route's comment on why Route Handlers check auth
// directly instead of using requireRole). Marked 'use server' only
// because the file needs to run server-side; no requireRole call
// lives in this function itself — the calling route is responsible
// for the admin check.

import { createClient } from '@/lib/supabase/server'

export type UserBackupRow = {
    fullName: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
}

// Every user, any role, active or deactivated — a backup needs the
// full roster, not just the active subset the admin Users page
// filters to by default. Soft-deleted (deleted_at set) rows are
// excluded, same as every other list in the app.
export async function getAllUsersForBackup(): Promise<UserBackupRow[]> {
    const supabase = await createClient()

    const { data } = await supabase
        .from('users')
        .select('full_name, email, role, is_active, created_at')
        .is('deleted_at', null)
        .order('role', { ascending: true })
        .order('full_name', { ascending: true })

    return (data ?? []).map((u) => ({
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        isActive: u.is_active,
        createdAt: u.created_at,
    }))
}
