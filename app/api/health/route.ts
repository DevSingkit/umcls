import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function checkDbConnectivity(): Promise<boolean> {
    try {
        const supabaseAdmin = createAdminClient();
        const { error } = await supabaseAdmin.from('users').select('id').limit(1);
        return !error;
    } catch {
        return false;
    }
}
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
        return NextResponse.json({
            status,
            db: dbOk ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
        });
    }
    return NextResponse.json({ status });
}