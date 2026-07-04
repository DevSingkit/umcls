import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// ⚠️ SERVICE-ROLE CLIENT — bypasses Row Level Security entirely.
//
// This is the exact import the .eslintrc.js no-restricted-imports rule
// blocks from client-reachable code (app/**/*.tsx, components/**/*.tsx,
// features/**/*.tsx). If your editor or a failed build is complaining
// about importing this file, that's the rule doing its job — you almost
// certainly want lib/supabase/server.ts (user-scoped) instead.
//
// Legitimate uses are rare and specific: reading data a role genuinely
// isn't allowed to see under RLS (e.g. the answer_options_for_student view
// pattern in DATABASE.md), or system-level writes with no natural "acting
// user" (e.g. a scheduled job). If you're not sure whether your use case
// qualifies, it probably doesn't — use the user-scoped client and let RLS
// do the enforcement, per the defense-in-depth pattern throughout
// DATABASE.md and SECURITY.md.
export function createAdminClient() {
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
