// app/api/activity/ping/route.ts

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