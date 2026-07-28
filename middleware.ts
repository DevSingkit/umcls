// middleware.ts
import { createServerClient, CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { redis } from '@/lib/security/rate-limit'
import { isSessionInactive } from '@/lib/security/guards'

// SECURITY.md §9 documents the header VALUES as living in next.config.ts,
// but the CSP's script-src nonce has to be generated fresh per request —
// next.config.ts's headers() is computed once at build time and can't do
// that. So the nonce + CSP itself are generated here, in middleware,
// which runs per-request.
function buildCsp(nonce: string) {
    // Next.js's DEV SERVER (webpack HMR / React Fast Refresh) uses eval()
    // internally to load modules — this is Next's own tooling, not
    // anything in this app's code. A strict-dynamic, no-unsafe-eval CSP
    // (correct and desired in production) blocks that eval() call and
    // silently breaks ALL client-side JS in dev.
    const isDev = process.env.NODE_ENV !== 'production'

    return [
        "default-src 'self'",
        isDev
            ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
            : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-src https://www.youtube.com https://youtube.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
    ].join('; ')
}

// PRODUCTION BUG FOUND during PH8-002 live verification: the previous
// version mutated `request.headers` in place and passed the whole
// `request` object to NextResponse.next({ request }). That does NOT
// reliably propagate to Next's internal RSC render in the way needed
// for Next to apply the nonce to its own framework <script> tags — the
// nonce showed up correctly in the CSP *response* header, but never
// reached the actual <script nonce="..."> attributes, so with
// 'strict-dynamic' present (which makes browsers ignore 'self' and
// host-based rules entirely, trusting ONLY nonce/hash-matched scripts),
// literally every script on the page — including Next's own framework
// bundles — was blocked. Total UI paralysis in production, not just a
// dev-mode issue.
//
// Fix, per Next.js's actual documented CSP pattern: build a *fresh*
// Headers object from the incoming request, set x-nonce and the CSP on
// THAT, and pass it as `request: { headers: requestHeaders }` — not the
// original request object. This has to be threaded through every single
// NextResponse.next()/redirect() call in this file, including the one
// Supabase's cookie setAll() callback creates, or the nonce silently
// stops propagating on requests that refresh the session cookie.
function buildRequestHeaders(request: NextRequest, nonce: string, csp: string): Headers {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', csp)
    return requestHeaders
}

function applyResponseHeaders(response: NextResponse, csp: string) {
    response.headers.set('Content-Security-Policy', csp)
    response.headers.set('X-DNS-Prefetch-Control', 'on')
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    return response
}

export async function middleware(request: NextRequest) {
    const nonce = crypto.randomUUID()
    const csp = buildCsp(nonce)
    const requestHeaders = buildRequestHeaders(request, nonce, csp)

    let response = NextResponse.next({ request: { headers: requestHeaders } })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    // Rebuild with the SAME requestHeaders (carrying the
                    // nonce/CSP) rather than a bare NextResponse.next({ request })
                    // — this was the specific line that silently dropped
                    // nonce propagation on any request that refreshed cookies.
                    response = NextResponse.next({ request: { headers: requestHeaders } })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl
    const isAdminPath = pathname.startsWith('/admin')
    const isTeacherPath = pathname.startsWith('/teacher')
    const isStudentPath = pathname.startsWith('/student')
    const isProtectedPath = isAdminPath || isTeacherPath || isStudentPath

    if (!user && isProtectedPath) {
        return applyResponseHeaders(NextResponse.redirect(new URL('/login', request.url), 303), csp)
    }

    if (user && isProtectedPath) {
        const { data: profile } = await supabase
            .from('users')
            .select('role, is_active, last_seen_at')
            .eq('id', user.id)
            .single()

        if (!profile?.is_active) {
            return applyResponseHeaders(
                NextResponse.redirect(new URL('/login?reason=deactivated', request.url), 303),
                csp
            )
        }

        // Grace period: if the user signed in within the last 60 seconds,
        // skip the inactivity check — last_seen_at hasn't been set by the
        // ping yet and null would incorrectly trigger a timeout redirect.
        const justSignedIn = user.last_sign_in_at &&
            Date.now() - new Date(user.last_sign_in_at).getTime() < 60_000

        if (!justSignedIn && isSessionInactive(profile.last_seen_at)) {
            return applyResponseHeaders(
                NextResponse.redirect(new URL('/login?reason=timeout', request.url), 303),
                csp
            )
        }

        const role = profile.role
        if (isAdminPath && role !== 'admin') {
            return applyResponseHeaders(NextResponse.redirect(new URL('/unauthorized', request.url), 303), csp)
        }
        if (isTeacherPath && role !== 'teacher') {
            return applyResponseHeaders(NextResponse.redirect(new URL('/unauthorized', request.url), 303), csp)
        }
        if (isStudentPath && role !== 'student') {
            return applyResponseHeaders(NextResponse.redirect(new URL('/unauthorized', request.url), 303), csp)
        }

        const cacheKey = `seen:${user.id}`
        const alreadyTracked = await redis.get(cacheKey)
        if (!alreadyTracked) {
            await redis.set(cacheKey, '1', { ex: 300 })
            const cookieHeader = request.headers.get('cookie') ?? ''
            fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activity/ping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
                body: JSON.stringify({ userId: user.id }),
            }).catch(() => { })
        }
    }

    return applyResponseHeaders(response, csp)
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
}