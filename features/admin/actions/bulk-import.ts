'use server'
// CSV Bulk Import (PH2-003). Every row is checked first, using the
// same rules as the single-user create-user.ts flow. If any row is
// invalid, nothing is created, full stop.
//
// Why creation happens in two steps: Supabase Auth accounts cannot be
// created inside a database transaction (they live outside Postgres),
// so we cannot make the whole thing one atomic step. Instead:
//   1. Create every Auth account one by one.
//   2. Once all of them exist, call bulk_finalize_users() once, which
//      writes every public.users row in a single transaction.
//   3. If step 2 fails, delete every Auth account created in step 1,
//      so nothing is left half-created.
import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const rowSchema = z.object({
    fullName: z.string().min(2, 'Name is too short'),
    email: z.string().email('Not a valid email'),
    role: z.enum(['teacher', 'student'], {
        errorMap: () => ({ message: 'Role must be "teacher" or "student"' }),
    }),
})

export type BulkImportRow = { fullName: string; email: string; role: string }

export type BulkImportResult =
    | {
        ok: true
        created: { fullName: string; email: string; role: string; temporaryPassword: string }[]
    }
    | { ok: false; error: string; rowErrors?: { row: number; message: string }[] }

// Generates a random password that already satisfies the same
// strength rule used in create-user.ts (12+ chars, upper, lower,
// number). Built from a fixed pool so it is easy to read out loud when
// handing it to a teacher or student in person.
function generateTemporaryPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lower = 'abcdefghijkmnpqrstuvwxyz'
    const digits = '23456789'
    const pick = (pool: string, count: number) =>
        Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]).join('')
    const raw = pick(upper, 3) + pick(lower, 6) + pick(digits, 3)
    return raw
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('')
}

export async function bulkImportUsers(rows: BulkImportRow[]): Promise<BulkImportResult> {
    await requireRole(['admin'])

    if (rows.length === 0) {
        return { ok: false, error: 'The CSV file has no rows to import.' }
    }

    // Step 1: validate every row before creating anything.
    const rowErrors: { row: number; message: string }[] = []
    const validRows: { fullName: string; email: string; role: 'teacher' | 'student' }[] = []
    const seenEmails = new Set<string>()

    rows.forEach((row, index) => {
        const parsed = rowSchema.safeParse({
            fullName: row.fullName?.trim(),
            email: row.email?.trim().toLowerCase(),
            role: row.role?.trim().toLowerCase(),
        })
        if (!parsed.success) {
            rowErrors.push({
                row: index + 2, // +2: header row is row 1, data starts at row 2
                message: parsed.error.issues[0]?.message ?? 'Invalid row',
            })
            return
        }
        if (seenEmails.has(parsed.data.email)) {
            rowErrors.push({ row: index + 2, message: `Duplicate email in file: ${parsed.data.email}` })
            return
        }
        seenEmails.add(parsed.data.email)
        validRows.push(parsed.data)
    })

    if (rowErrors.length > 0) {
        return {
            ok: false,
            error: 'Some rows had problems. Fix them and upload again. Nothing was created.',
            rowErrors,
        }
    }

    // Also check none of these emails already exist in the system,
    // before creating anything.
    const supabase = await createClient()
    const { data: existing } = await supabase
        .from('users')
        .select('email')
        .in('email', validRows.map((r) => r.email))

    if (existing && existing.length > 0) {
        const existingEmails = new Set(existing.map((u) => u.email))
        return {
            ok: false,
            error: 'Some emails already have an account. Remove those rows and try again. Nothing was created.',
            rowErrors: validRows
                .map((r, i) => (existingEmails.has(r.email) ? { row: i + 2, message: `${r.email} already exists` } : null)
                )
                .filter((x): x is { row: number; message: string } => x !== null),
        }
    }

    // Step 2: create every Auth account. If any single one fails
    // partway through, undo the ones already created.
    //
    // createdAuthIds and createdForResult used to be built as two
    // separate arrays, then zipped back together afterward by indexing
    // createdForResult[i] inside the finalize step below. TypeScript's
    // noUncheckedIndexedAccess correctly flags that as possibly
    // undefined — the type checker has no way to know the two arrays
    // stay in lockstep. Fixed by building one array of paired
    // { authId, ...row } objects instead, in the same loop where both
    // values already exist together, so there's no later re-indexing
    // at all.
    const supabaseAdmin = createAdminClient()
    const created: {
        authId: string
        fullName: string
        email: string
        role: string
        temporaryPassword: string
    }[] = []

    for (const row of validRows) {
        const temporaryPassword = generateTemporaryPassword()
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: row.email,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: { full_name: row.fullName, role: row.role },
        })

        if (authError || !authUser.user) {
            // Undo everything created so far in this batch.
            for (const c of created) {
                await supabaseAdmin.auth.admin.deleteUser(c.authId)
            }
            return {
                ok: false,
                error: `Could not create an account for ${row.email}. Nothing was created, please try again.`,
            }
        }

        created.push({
            authId: authUser.user.id,
            fullName: row.fullName,
            email: row.email,
            role: row.role,
            temporaryPassword,
        })
    }

    // Step 3: write every public.users row in one transaction. This
    // runs as the logged-in admin (not the service-role client), since
    // log_audit_event reads auth.uid() to know who did this.
    const { error: finalizeError } = await supabase.rpc('bulk_finalize_users', {
        p_users: created.map((c) => ({
            auth_id: c.authId,
            full_name: c.fullName,
            email: c.email,
            role: c.role,
        })),
    })

    if (finalizeError) {
        // Roll back every Auth account created in step 2.
        for (const c of created) {
            await supabaseAdmin.auth.admin.deleteUser(c.authId)
        }
        return {
            ok: false,
            error: 'Something went wrong saving the accounts. Nothing was created, please try again.',
        }
    }

    return {
        ok: true,
        created: created.map((c) => ({
            fullName: c.fullName,
            email: c.email,
            role: c.role,
            temporaryPassword: c.temporaryPassword,
        })),
    }
}