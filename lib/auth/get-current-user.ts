// See lib/auth/AUTH_NOTES.md for why these checks exist
import { cache } from 'react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isSessionInactive } from '@/lib/security/guards'

type Role = 'admin' | 'teacher' | 'student'

/**
 * Gets the current logged in user, or null if nobody is logged in.
 *
 * PERF-002 fast path: middleware.ts already runs auth.getUser() plus a
 * users select for every request to an /admin, /teacher, or /student
 * path, and stamps the verified result onto request headers
 * (x-user-id, x-user-role, etc). If those headers are present, this
 * function uses them directly instead of repeating the same two
 * Supabase round-trips a second time. This is not a weaker check —
 * middleware already confirmed the session against Supabase directly
 * via auth.getUser() (not a trusted cookie), and these are server-side
 * request headers Next.js reconstructs itself; a client cannot inject
 * or spoof them from the browser.
 *
 * If the headers are absent — e.g. a route outside the matcher's
 * protected paths, middleware being skipped/misconfigured, or a
 * request type where header propagation doesn't apply — this falls
 * back to the original full check (auth.getUser() + users select), so
 * behavior is always correct even when the fast path can't be used.
 *
 * Uses getUser, not getSession, in the fallback path because getUser
 * confirms the login with Supabase directly instead of trusting a
 * cookie that could be outdated or tampered with.
 *
 * Returns null for a deactivated account. Does NOT redirect for an
 * inactive (timed-out) session on its own — that's requireUser's job.
 * This function is also used in places that just want to know "who's
 * logged in, if anyone" without forcing a redirect.
 *
 * Wrapped in React's cache() so multiple calls within the same request
 * (e.g. requireRole() being called separately by several dashboard-stats
 * functions on one page) resolve once instead of repeating work per call.
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
    const headerList = await headers()
    const headerUserId = headerList.get('x-user-id')

    if (headerUserId) {
        const headerActive = headerList.get('x-user-active') === 'true'
        if (!headerActive) {
            return null
        }
        const headerFullName = headerList.get('x-user-full-name')
        return {
            id: headerUserId,
            email: headerList.get('x-user-email') || null,
            role: headerList.get('x-user-role') as Role,
            fullName: headerFullName ? decodeURIComponent(headerFullName) : '',
            lastSeenAt: headerList.get('x-user-last-seen') || null,
        }
    }

    // Fallback: no middleware-stamped headers available (route outside
    // the protected matcher, or middleware skipped) — do the real check.
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
 * AUTH_NOTES.md for why that redundancy exists. When the fast path
 * above is used, this is effectively re-checking middleware's own
 * result rather than hitting Supabase again — still meaningful as a
 * belt-and-suspenders check, just no longer a duplicate network call.
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
