// See lib/auth/AUTH_NOTES.md for why these checks exist
import { cache } from 'react'
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
 *
 * Wrapped in React's cache() so multiple calls within the same request
 * (e.g. requireRole() being called separately by several dashboard-stats
 * functions on one page) resolve to a single Supabase round-trip instead
 * of one per call. This does NOT dedupe across the middleware's own
 * auth.getUser() call — that's a separate request lifecycle — only
 * within this request's server-component/action tree.
 *
 * PHASE 8 / DB CLEANUP FIX (2026-08-30, continued conversation): this
 * file previously selected preferred_simplify_language and returned it
 * as preferredSimplifyLanguage on the user object. That column was
 * dropped by migration 089_drop_ai_simplify_schema.sql earlier this
 * session as part of retiring AI Simplify — but THIS file was never
 * checked or updated at the time, since it wasn't uploaded until now.
 * Left as-is, the SELECT below would fail against the real (post-
 * migration) schema on every single call — breaking getCurrentUser()
 * for every user, which breaks nearly the entire app, since almost
 * every page depends on requireUser/requireRole. Caught before real
 * damage only because the user happened to share this file while
 * investigating an unrelated stale-copy issue — worth remembering
 * that a column-drop migration's blast radius includes every file
 * that reads that table, not just the ones already reviewed.
 */
export const getCurrentUser = cache(async function getCurrentUser() {
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
})

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
        redirect('/')
    }
    if (isSessionInactive(user.lastSeenAt)) {
        redirect('/?reason=timeout')
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