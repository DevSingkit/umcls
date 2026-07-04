// middleware.ts
import { createServerClient, CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { redis } from '@/lib/security/rate-limit'
import { isSessionInactive } from '@/lib/security/guards'

export async function middleware(request: NextRequest) {
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
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && isProtectedPath) {
        const { data: profile } = await supabase
            .from('users')
            .select('role, is_active, last_seen_at')
            .eq('id', user.id)
            .single()

        if (!profile?.is_active) {
            return NextResponse.redirect(new URL('/login?reason=deactivated', request.url))
        }

        // Grace period: if the user signed in within the last 60 seconds,
        // skip the inactivity check — last_seen_at hasn't been set by the
        // ping yet and null would incorrectly trigger a timeout redirect.
        const justSignedIn = user.last_sign_in_at &&
            Date.now() - new Date(user.last_sign_in_at).getTime() < 60_000

        if (!justSignedIn && isSessionInactive(profile.last_seen_at)) {
            return NextResponse.redirect(new URL('/login?reason=timeout', request.url))
        }

        const role = profile.role
        if (isAdminPath && role !== 'admin') {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
        if (isTeacherPath && role !== 'teacher') {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
        if (isStudentPath && role !== 'student') {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
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

    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
}