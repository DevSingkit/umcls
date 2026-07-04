// See lib/auth/AUTH_NOTES.md for why these checks exist.
//
// This file holds the session-inactivity check and the forced-signout
// helper. Both middleware.ts and lib/auth/get-current-user.ts import
// isSessionInactive() so the 24-hour rule lives in exactly one place,
// checked at two layers (middleware first, requireUser/requireRole
// second) — same defense-in-depth reasoning as the role checks.

import { createAdminClient } from "@/lib/supabase/admin";

// FR-AUTH-06: 24 hours of no activity ends the session, even if the
// underlying auth token is still technically valid.
const INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000;

/**
 * True if this session should be treated as expired due to inactivity.
 * A null last_seen_at (never recorded — e.g. a brand new account that
 * somehow reached a protected page before its first ping) counts as
 * inactive. Fail closed, not open.
 */
export function isSessionInactive(lastSeenAt: string | null): boolean {
    if (!lastSeenAt) return true;
    const elapsed = Date.now() - new Date(lastSeenAt).getTime();
    return elapsed > INACTIVITY_LIMIT_MS;
}

/**
 * Invalidates every active session for a user, on every device, right
 * now — instead of waiting for their token to expire naturally. Call
 * this the instant an admin changes someone's role or deactivates their
 * account, so the change takes effect immediately.
 *
 * NOT wired up to anything yet. The feature that actually changes a
 * user's role — PH2-002, admin user management — doesn't exist yet.
 * Whoever builds PH2-002 should call forceSignOutUser(userId) right
 * after writing the new role (or is_active = false) to the database.
 */
export async function forceSignOutUser(userId: string): Promise<void> {
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.auth.admin.signOut(userId, "global");
}