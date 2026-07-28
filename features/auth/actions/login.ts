// See lib/auth/AUTH_NOTES.md for why these checks exist
'use server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginBurstRateLimit, loginSustainedRateLimit } from '@/lib/security/rate-limit'
// SECURITY.md §10: 5 attempts / 15 min / IP, 429 + audit log entry on
// exceed. loginRateLimit was already built in lib/security/rate-limit.ts
// but was never actually imported here — this was a real gap found during
// the PH8-002 pentest checklist walkthrough (Auth bypass section): login
// had zero brute-force protection despite the limiter existing.
function getClientIp(headerList: Headers): string {
    return (
        headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        headerList.get('x-real-ip') ??
        '0.0.0.0'
    )
}
export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    if (!email || !password) {
        return { error: 'Please enter your email and password.' }
    }
    const headerList = await headers()
    const ip = getClientIp(headerList)
    // Rate limit before touching Supabase at all — cheapest possible
    // rejection, and keyed per-IP so one attacker can't lock out a
    // legitimate user's email, only their own IP.
    //
    // Two limiters, both must pass:
    //   - burst: generous, short window — a real person mistyping their
    //     password a few times in a row never trips this.
    //   - sustained: stricter, long window — catches an attacker who
    //     spaces attempts out to stay under the burst limit. A real
    //     person never legitimately needs 20+ attempts inside an hour.
    const [burst, sustained] = await Promise.all([
        loginBurstRateLimit.limit(`login:${ip}`),
        loginSustainedRateLimit.limit(`login:${ip}`),
    ])
    const success = burst.success && sustained.success
    const supabase = await createClient()
    if (!success) {
        // Audit the throttle itself, not just failed logins below — a
        // burst of attempts hitting the rate limit is a signal worth
        // keeping even if we never learn which emails were tried.
        await supabase.rpc('log_audit_event', {
            p_action: 'AUTH_LOGIN_RATE_LIMITED',
            p_metadata: { ip, limiter: !burst.success ? 'burst' : 'sustained' },
        })
        return { error: 'Too many login attempts. Please wait a few minutes and try again.' }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })
    if (error || !data.user) {
        await supabase.rpc('log_audit_event', {
            p_action: 'AUTH_LOGIN_FAILED',
            p_metadata: { ip, email },
        })
        return { error: 'Invalid email or password.' }
    }
    // Confirm the account is active and get the role.
    // We check this here too, not just in middleware, in case
    // middleware is ever skipped by mistake.
    const { data: profile } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single()
    if (!profile || !profile.is_active) {
        await supabase.auth.signOut()
        return { error: 'This account is not active. Please contact your school admin.' }
    }
    // Seed last_seen_at so middleware inactivity check doesn't
    // immediately fire on the first request after login (null = inactive by design)
    await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', data.user.id)
    await supabase.rpc('log_audit_event', {
        p_action: 'AUTH_LOGIN',
        p_metadata: { ip },
    })
    // Record this login for the admin dashboard's weekly activity graph.
    // Logging the error here (temporarily) so we can see in the server
    // console exactly why this insert is failing, instead of it failing
    // silently like before.
    const { error: loginEventError } = await supabase.from('login_events').insert({
        user_id: data.user.id,
        role: profile.role,
    })
    if (loginEventError) {
        console.error('login_events insert failed:', loginEventError.message)
    }
    if (profile.role === 'admin') {
        redirect('/admin/dashboard')
    } else if (profile.role === 'teacher') {
        redirect('/teacher/dashboard')
    } else {
        redirect('/student/dashboard')
    }
}