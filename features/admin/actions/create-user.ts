'use server'
// See lib/auth/AUTH_NOTES.md for why this check exists.
//
// This action creates a login account in Supabase Auth. A database
// trigger (handle_new_user, see DATABASE.md §7.1) automatically creates
// the matching public.users row the moment the login account exists.
// That trigger reads full_name and role from the account's metadata,
// so we pass those in at creation time instead of inserting the row
// ourselves afterward. Inserting it ourselves is what was causing the
// save error: the trigger already created the row, so the manual
// insert was hitting the same id and failing.
//
// Only an admin is allowed to run this. We check that with requireRole
// before touching the database, same pattern as every other protected
// action in this project.
import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createAdminClient } from '@/lib/supabase/admin'
const createUserSchema = z.object({
    fullName: z.string().min(2, 'Name is too short'),
    email: z.string().email('Enter a valid email'),
    role: z.enum(['teacher', 'student']),
    temporaryPassword: z
        .string()
        .min(12, 'Password must be at least 12 characters')
        .regex(/[a-z]/, 'Password needs a lowercase letter')
        .regex(/[A-Z]/, 'Password needs an uppercase letter')
        .regex(/[0-9]/, 'Password needs a number'),
})
export type CreateUserResult =
    | { ok: true }
    | { ok: false; error: string }
export async function createUser(formData: FormData): Promise<CreateUserResult> {
    // Step 1: only an admin can do this. requireRole throws if not, which
    // is caught below and turned into a normal error result for the form.
    await requireRole(['admin'])
    const parsed = createUserSchema.safeParse({
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        role: formData.get('role'),
        temporaryPassword: formData.get('temporaryPassword'),
    })
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }
    const { fullName, email, role, temporaryPassword } = parsed.data
    // This is the one place a service-role client is genuinely needed:
    // creating a login account is a system-level action with no natural
    // "acting user" other than the admin approving it. See the warning
    // comment in lib/supabase/admin.ts.
    const supabaseAdmin = createAdminClient()
    // Create the login account, and pass full_name and role in the
    // metadata so the database trigger can use them when it builds the
    // public.users row automatically. No manual insert needed.
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true, // admin is creating this directly, no email verification step for V1
        user_metadata: {
            full_name: fullName,
            role,
        },
    })
    if (authError || !authUser.user) {
        return { ok: false, error: authError?.message ?? 'Could not create the login account.' }
    }
    return { ok: true }
}