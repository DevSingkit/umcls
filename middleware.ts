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
// which runs per-request. The other static headers (HSTS, X-Frame-Options,
// etc.) are also set here for the same reason: one place, one source of
// truth, instead of splitting header logic across two files.
function buildCsp(nonce: string) {
    // Next.js's DEV SERVER (webpack HMR / React Fast Refresh) uses eval()
    // internally to load modules — this is Next's own tooling, not
    // anything in this app's code. A strict-dynamic, no-unsafe-eval CSP
    // (correct and desired in production) blocks that eval() call and
    // silently breaks ALL client-side JS in dev, including plain
    // useState handlers with no server/network involvement at all. That
    // was the actual cause of "nothing happens on click" locally — not
    // Supabase, not Redis, not the login action.
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

function applySecurityHeaders(response: NextResponse, nonce: string) {
    response.headers.set('Content-Security-Policy', buildCsp(nonce))
    response.headers.set('X-DNS-Prefetch-Control', 'on')
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    return response
}

export async function middleware(request: NextRequest) {
    // Generate the nonce first and attach it to the *request* headers
    // (not just the response). Next.js reads x-nonce off the incoming
    // request to apply it to its own framework-injected <script> tags —
    // this only works if it's set before NextResponse.next() is built,
    // which is why this happens before the Supabase client setup below.
    const nonce = crypto.randomUUID()
    request.headers.set('x-nonce', nonce)

    let response = NextResponse.next({ request })

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
                    response = NextResponse.next({ request })
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
        return applySecurityHeaders(NextResponse.redirect(new URL('/login', request.url)), nonce)
    }

    if (user && isProtectedPath) {
        const { data: profile } = await supabase
            .from('users')
            .select('role, is_active, last_seen_at')
            .eq('id', user.id)
            .single()

        if (!profile?.is_active) {
            return applySecurityHeaders(
                NextResponse.redirect(new URL('/login?reason=deactivated', request.url)),
                nonce
            )
        }

        // Grace period: if the user signed in within the last 60 seconds,
        // skip the inactivity check — last_seen_at hasn't been set by the
        // ping yet and null would incorrectly trigger a timeout redirect.
        const justSignedIn = user.last_sign_in_at &&
            Date.now() - new Date(user.last_sign_in_at).getTime() < 60_000

        if (!justSignedIn && isSessionInactive(profile.last_seen_at)) {
            return applySecurityHeaders(
                NextResponse.redirect(new URL('/login?reason=timeout', request.url)),
                nonce
            )
        }

        const role = profile.role
        if (isAdminPath && role !== 'admin') {
            return applySecurityHeaders(NextResponse.redirect(new URL('/unauthorized', request.url)), nonce)
        }
        if (isTeacherPath && role !== 'teacher') {
            return applySecurityHeaders(NextResponse.redirect(new URL('/unauthorized', request.url)), nonce)
        }
        if (isStudentPath && role !== 'student') {
            return applySecurityHeaders(NextResponse.redirect(new URL('/unauthorized', request.url)), nonce)
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

    return applySecurityHeaders(response, nonce)
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
}