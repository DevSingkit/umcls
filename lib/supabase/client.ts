import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

// User-scoped client for Client Components. Every query through this client
// goes through the requesting user's own auth token, so RLS policies
// (DATABASE.md) apply normally. This is the client you want almost always.
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
