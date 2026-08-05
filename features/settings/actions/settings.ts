'use server'
// See lib/auth/AUTH_NOTES.md for why these checks exist.
// Settings is reachable by any logged-in role — requireUser, not
// requireRole, since a teacher, student, or admin all have the same
// four sections (profile, password, notifications, text size). Every
// action below only ever reads or writes the calling user's own row;
// nothing here takes a userId parameter from the client.

import { z } from 'zod'
import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type MySettings = {
    fullName: string
    email: string | null
    avatarUrl: string | null
    notifications: {
        commentsEnabled: boolean
        gradesEnabled: boolean
        newLessonsEnabled: boolean
    }
    textSize: 'normal' | 'larger'
}

// Reads everything the Settings page needs in one call: profile fields
// from users, notification toggles from notification_preferences (may
// not have a row yet for an existing user — defaults to all-on if so),
// and the text-size preference, which lives in users.metadata (jsonb)
// rather than its own column since it's a single small per-user flag,
// same reasoning as other lightweight metadata already stored there.
export async function getMySettings(): Promise<MySettings> {
    const user = await requireUser()
    const supabase = await createClient()

    const [{ data: profile }, { data: prefs }] = await Promise.all([
        supabase.from('users').select('full_name, email, avatar_url, metadata').eq('id', user.id).single(),
        supabase
            .from('notification_preferences')
            .select('comments_enabled, grades_enabled, new_lessons_enabled')
            .eq('user_id', user.id)
            .maybeSingle(),
    ])

    const metadata = (profile?.metadata as Record<string, unknown>) ?? {}
    const textSize = metadata.text_size === 'larger' ? 'larger' : 'normal'

    return {
        fullName: profile?.full_name ?? user.fullName,
        email: profile?.email ?? user.email ?? null,
        avatarUrl: (profile?.avatar_url as string | null) ?? null,
        notifications: {
            commentsEnabled: prefs?.comments_enabled ?? true,
            gradesEnabled: prefs?.grades_enabled ?? true,
            newLessonsEnabled: prefs?.new_lessons_enabled ?? true,
        },
        textSize,
    }
}

const updateProfileSchema = z.object({
    fullName: z.string().min(2, 'Name is too short'),
})

export type SettingsActionResult = { ok: true } | { ok: false; error: string }

// Name and avatar only — email is intentionally not editable here.
// Changing a login email is a Supabase Auth operation with its own
// confirmation-link flow, out of scope for a simple profile form; the
// page shows email as read-only rather than silently accepting edits
// that would never actually take effect.
export async function updateProfile(formData: FormData): Promise<SettingsActionResult> {
    const user = await requireUser()

    const parsed = updateProfileSchema.safeParse({
        fullName: formData.get('fullName'),
    })
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const avatarUrl = formData.get('avatarUrl')
    const supabase = await createClient()

    const { error } = await supabase
        .from('users')
        .update({
            full_name: parsed.data.fullName,
            avatar_url: typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null,
        })
        .eq('id', user.id)

    if (error) {
        return { ok: false, error: 'Could not save your profile. Please try again.' }
    }

    return { ok: true }
}

// Same password rule as reset-password.ts / users.ts (PH1-002 AC): min
// 12 chars, upper + lower + number.
const passwordSchema = z
    .string()
    .min(12, 'Password must be at least 12 characters.')
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/[0-9]/, 'Password must include a number.')

// Changing your own password while already logged in. Unlike
// reset-password.ts (which trusts a one-time recovery link as proof of
// identity) and users.ts's admin resetUserPassword (which trusts admin
// privilege), this path has neither — so it re-verifies the current
// password first via a fresh sign-in check, same "don't trust a
// session alone" reasoning as AUTH_NOTES.md's getUser rule, applied to
// the current password itself.
export async function changePassword(formData: FormData): Promise<SettingsActionResult> {
    const user = await requireUser()

    const currentPassword = formData.get('currentPassword')
    const newPassword = formData.get('newPassword')
    const confirmPassword = formData.get('confirmPassword')

    if (typeof currentPassword !== 'string' || !currentPassword) {
        return { ok: false, error: 'Please enter your current password.' }
    }

    const parsedNew = passwordSchema.safeParse(newPassword)
    if (!parsedNew.success) {
        return { ok: false, error: parsedNew.error.issues[0]?.message ?? 'Password does not meet the requirements.' }
    }

    if (newPassword !== confirmPassword) {
        return { ok: false, error: 'New passwords do not match.' }
    }

    if (!user.email) {
        return { ok: false, error: 'Could not verify your account email.' }
    }

    const supabase = await createClient()

    // Re-verify the current password by attempting a fresh sign-in with
    // it. This doesn't change the active session on success/failure —
    // it's purely a check that the person typing this form actually
    // knows the current password, not just that their browser still has
    // a valid cookie.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    })

    if (verifyError) {
        return { ok: false, error: 'Your current password is incorrect.' }
    }

    const { error: updateError } = await supabase.auth.updateUser({
        password: parsedNew.data,
    })

    if (updateError) {
        return { ok: false, error: 'Could not update your password. Please try again.' }
    }

    return { ok: true }
}

const notificationPrefsSchema = z.object({
    commentsEnabled: z.boolean(),
    gradesEnabled: z.boolean(),
    newLessonsEnabled: z.boolean(),
})

// Upserts, since a user may not have a notification_preferences row yet
// (the table is new — existing users have no row until they first save
// here, or until a backfill migration adds one; upsert covers both
// "never had a row" and "editing an existing row" in one call).
export async function updateNotificationPreferences(
    prefs: z.infer<typeof notificationPrefsSchema>
): Promise<SettingsActionResult> {
    const user = await requireUser()

    const parsed = notificationPrefsSchema.safeParse(prefs)
    if (!parsed.success) {
        return { ok: false, error: 'Invalid preferences.' }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        comments_enabled: parsed.data.commentsEnabled,
        grades_enabled: parsed.data.gradesEnabled,
        new_lessons_enabled: parsed.data.newLessonsEnabled,
        updated_at: new Date().toISOString(),
    })

    if (error) {
        return { ok: false, error: 'Could not save your notification preferences.' }
    }

    return { ok: true }
}

const textSizeSchema = z.enum(['normal', 'larger'])

// Stored in users.metadata (jsonb) rather than a new column — a single
// small per-user display flag, same shape as other lightweight settings
// already kept there. Read back out by getMySettings() above.
export async function updateTextSizePreference(textSize: 'normal' | 'larger'): Promise<SettingsActionResult> {
    const user = await requireUser()

    const parsed = textSizeSchema.safeParse(textSize)
    if (!parsed.success) {
        return { ok: false, error: 'Invalid text size.' }
    }

    const supabase = await createClient()

    const { data: profile } = await supabase.from('users').select('metadata').eq('id', user.id).single()
    const existingMetadata = (profile?.metadata as Record<string, unknown>) ?? {}

    const { error } = await supabase
        .from('users')
        .update({ metadata: { ...existingMetadata, text_size: parsed.data } })
        .eq('id', user.id)

    if (error) {
        return { ok: false, error: 'Could not save your text size preference.' }
    }

    return { ok: true }
}

const simplifyLanguageSchema = z.enum(['english', 'tagalog'])

export async function updatePreferredSimplifyLanguage(
    language: 'english' | 'tagalog'
): Promise<SettingsActionResult> {
    const user = await requireUser()

    const parsed = simplifyLanguageSchema.safeParse(language)
    if (!parsed.success) {
        return { ok: false, error: 'Invalid language.' }
    }

    const supabase = await createClient()

    const { data: updated, error } = await supabase
        .from('users')
        .update({ preferred_simplify_language: parsed.data })
        .eq('id', user.id)
        .select('id')

    if (error || !updated || updated.length === 0) {
        return { ok: false, error: 'Could not save your language preference.' }
    }

    return { ok: true }
}