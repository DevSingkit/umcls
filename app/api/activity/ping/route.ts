// app/api/activity/ping/route.ts
// Called by middleware.ts, at most once per 5 minutes per user
// (fire-and-forget). Updates last_seen_at so the inactivity timeout
// checked in middleware.ts and requireUser() has a fresh value to
// compare against.
//
// See lib/auth/AUTH_NOTES.md: getUser() is the only source of truth for
// identity here. The userId in the request body is never trusted by
// itself — the session cookie forwarded by middleware is what's actually
// authenticated.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
    const supabase = await createClient()

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Uses the admin client for the write itself: this is a system-
    // triggered field update, not a user-initiated one, and shouldn't
    // depend on whatever RLS update policy (if any) exists on the users
    // table for a person editing their own row.
    const supabaseAdmin = createAdminClient()
    const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id)

    if (updateError) {
        return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}