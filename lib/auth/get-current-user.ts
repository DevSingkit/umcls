// See lib/auth/AUTH_NOTES.md for why these checks exist
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isSessionInactive } from '@/lib/security/guards'

type Role = 'admin' | 'teacher' | 'student'

/**
 * Gets the current logged in user, or null if nobody is logged in.
 * Uses getUser, not getSession, because getUser confirms the login
 * with Supabase directly instead of trusting a cookie that could be
 * outdated or tampered with.
 *
 * Returns null for a deactivated account. Does NOT redirect for an
 * inactive (timed-out) session on its own — that's requireUser's job.
 * This function is also used in places that just want to know "who's
 * logged in, if anyone" without forcing a redirect.
 */
export async function getCurrentUser() {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()
    if (error || !user) {
        return null
    }
    const { data: profile } = await supabase
        .from('users')
        .select('id, role, is_active, full_name, last_seen_at')
        .eq('id', user.id)
        .single()
    if (!profile || !profile.is_active) {
        return null
    }
    return {
        id: user.id,
        email: user.email,
        role: profile.role as Role,
        fullName: profile.full_name,
        lastSeenAt: profile.last_seen_at as string | null,
    }
}

/**
 * Stops the page if nobody is logged in, or if their session has gone
 * stale from inactivity (PH1-003 / FR-AUTH-06 — 24 hours with no
 * activity). Sends the person to the login page either way.
 *
 * Middleware is the first checkpoint for both of these checks. This is
 * the second, in case middleware is ever skipped or misconfigured — see
 * AUTH_NOTES.md for why that redundancy exists.
 */
export async function requireUser() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }
    if (isSessionInactive(user.lastSeenAt)) {
        redirect('/login?reason=timeout')
    }
    return user
}

/**
 * Stops the page if the logged in person has the wrong role.
 * This throws instead of quietly doing nothing, because reaching
 * this point with the wrong role means a bug let someone get here
 * who should not have. Throwing makes that loud so it gets fixed.
 */
export async function requireRole(allowedRoles: Role[]) {
    const user = await requireUser()
    if (!allowedRoles.includes(user.role)) {
        throw new Error(
            `requireRole blocked access: role "${user.role}" is not in [${allowedRoles.join(', ')}]`
        )
    }
    return user
}