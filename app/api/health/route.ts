import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
// NOTE: `createAdminClient` is assumed per lib/supabase/admin.ts's undocumented
// export (same assumption already made in guards.ts / activity/ping route).
// Confirm the real export name before shipping — see AUTH_NOTES.md handoff.

export const dynamic = 'force-dynamic';

/**
 * Lightweight DB connectivity probe. Uses the admin client so the check
 * doesn't depend on any caller session/RLS context — this route is
 * unauthenticated and must work even when no user is logged in.
 */
async function checkDbConnectivity(): Promise<boolean> {
    try {
        const supabaseAdmin = createAdminClient();
        const { error } = await supabaseAdmin.from('users').select('id').limit(1);
        return !error;
    } catch {
        return false;
    }
}

/**
 * Constant-time secret comparison — a naive `===` on a shared secret header
 * is a timing side-channel. Same class of fix as the RC hardening pass.
 */
function isValidMonitorSecret(provided: string | null): boolean {
    const expected = process.env.MONITOR_SECRET;
    if (!provided || !expected) return false;

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;

    return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
    const dbOk = await checkDbConnectivity();
    const status: 'ok' | 'degraded' = dbOk ? 'ok' : 'degraded';

    const monitorSecret = request.headers.get('X-Monitor-Secret');

    if (isValidMonitorSecret(monitorSecret)) {
        // Detailed response for monitoring systems (UptimeRobot, etc.) only.
        return NextResponse.json({
            status,
            db: dbOk ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            // `version` is deliberately never included — it maps directly to
            // CVEs in the dependency tree (FIND-016).
        });
    }

    // Public path: minimal disclosure. Still reflects real status
    // (LMS_ARCHITECTURE.md §9.1), just without component detail.
    return NextResponse.json({ status });
}