'use server'
// See lib/auth/AUTH_NOTES.md for why these checks exist.
// Settings is reachable by any logged-in role — requireUser, not
// requireRole, since a teacher, student, or admin all have the same
// four sections (profile, password, notifications, text size). Every
// action below only ever reads or writes the calling user's own row;
// nothing here takes a userId parameter from the client.
//
// G4 (avatar upload, public bucket): avatar_url now stores the
// permanent public storage URL directly — no signed-URL resolution
// needed anywhere, since the bucket is public. updateProfile no
// longer accepts an avatarUrl field (the old paste-a-link input is
// gone); uploadAvatar/removeAvatar handle the photo separately.

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
// and the text-size preference, which lives in users.metadata (jsonb).
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

// Name only — avatar moved to uploadAvatar below.
export async function updateProfile(formData: FormData): Promise<SettingsActionResult> {
    const user = await requireUser()

    const parsed = updateProfileSchema.safeParse({
        fullName: formData.get('fullName'),
    })
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('users')
        .update({ full_name: parsed.data.fullName })
        .eq('id', user.id)

    if (error) {
        return { ok: false, error: 'Could not save your profile. Please try again.' }
    }

    return { ok: true }
}

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type UploadAvatarResult = { ok: true; avatarUrl: string } | { ok: false; error: string }

// Uploads a new avatar photo, replacing any previous one. Stores and
// returns the permanent public URL directly — public bucket, so no
// signed-URL step needed.
export async function uploadAvatar(formData: FormData): Promise<UploadAvatarResult> {
    const user = await requireUser()

    const fileEntry = formData.get('avatar')
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null
    if (!file) {
        return { ok: false, error: 'Please choose a photo.' }
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
        return { ok: false, error: 'That file type is not allowed. Allowed: JPEG, PNG, WEBP.' }
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
        return { ok: false, error: 'Photo is too large. Max size is 5 MB.' }
    }

    const supabase = await createClient()

    // Look up any existing avatar path first, so the old file can be
    // cleaned up after a successful upload.
    const { data: existing } = await supabase.from('users').select('avatar_url').eq('id', user.id).single()
    const previousUrl = existing?.avatar_url as string | null

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
        return { ok: false, error: 'Upload failed. Please try again.' }
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(storagePath)
    const avatarUrl = publicUrlData.publicUrl

    const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

    if (updateError) {
        // Best-effort cleanup of the just-uploaded file if the DB write
        // failed, so it doesn't become an orphaned object.
        await supabase.storage.from('avatars').remove([storagePath])
        return { ok: false, error: 'Could not save your new photo. Please try again.' }
    }

    // Clean up the old file only after the new one is confirmed live.
    // previousUrl is a full public URL, not a bare path — extract the
    // path (everything after the bucket name in the URL) before
    // calling remove(), which expects a path, not a URL.
    if (previousUrl) {
        const marker = '/avatars/'
        const idx = previousUrl.indexOf(marker)
        if (idx !== -1) {
            const previousPath = previousUrl.slice(idx + marker.length)
            await supabase.storage.from('avatars').remove([previousPath])
        }
    }

    return { ok: true, avatarUrl }
}

export type RemoveAvatarResult = { ok: true } | { ok: false; error: string }

// Lets a user go back to the initial-circle fallback.
export async function removeAvatar(): Promise<RemoveAvatarResult> {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: existing } = await supabase.from('users').select('avatar_url').eq('id', user.id).single()
    const previousUrl = existing?.avatar_url as string | null

    const { error } = await supabase.from('users').update({ avatar_url: null }).eq('id', user.id)
    if (error) {
        return { ok: false, error: 'Could not remove your photo. Please try again.' }
    }

    if (previousUrl) {
        const marker = '/avatars/'
        const idx = previousUrl.indexOf(marker)
        if (idx !== -1) {
            const previousPath = previousUrl.slice(idx + marker.length)
            await supabase.storage.from('avatars').remove([previousPath])
        }
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
