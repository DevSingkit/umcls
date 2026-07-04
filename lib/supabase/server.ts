import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

// User-scoped client for Server Components and Server Actions — reads the
// user's session from cookies. Still respects RLS, just like the browser
// client. This is what gradeSubmission and friends should use (see
// DATABASE.md §3.15's M-02 note on why service-role is wrong for that
// action specifically).
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component, which can't set cookies — safe
          // to ignore if you have middleware refreshing sessions.
        }
      },
    },
  })
}
