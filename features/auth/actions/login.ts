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
    // The three writes below (last_seen_at update, audit log, login_events
    // insert) are independent of each other — none of them read a result
    // the others produce, they only depend on data.user.id / profile.role
    // which we already have. They used to run one after another, paying
    // for 3 full sequential round-trips. Running them concurrently costs
    // roughly the time of the single slowest one instead of the sum of
    // all three — this was the single biggest contributor to login being
    // slow.
    //
    // last_seen_at is seeded here so middleware's inactivity check
    // doesn't immediately fire on the first request after login (null =
    // inactive by design).
    //
    // login_events insert failures are logged (not thrown) so a logging
    // hiccup never blocks someone from actually logging in.
    const [, , loginEventResult] = await Promise.all([
        supabase
            .from('users')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', data.user.id),
        supabase.rpc('log_audit_event', {
            p_action: 'AUTH_LOGIN',
            p_metadata: { ip },
        }),
        supabase.from('login_events').insert({
            user_id: data.user.id,
            role: profile.role,
        }),
    ])
    if (loginEventResult.error) {
        console.error('login_events insert failed:', loginEventResult.error.message)
    }
    if (profile.role === 'admin') {
        redirect('/admin/dashboard')
    } else if (profile.role === 'teacher') {
        redirect('/teacher/dashboard')
    } else {
        redirect('/student/dashboard')
    }
}
