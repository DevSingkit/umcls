import { z } from 'zod'

// PH0-002 AC: "Application throws a descriptive error on startup if any
// required env var is missing." This file is that check — import it once,
// early (e.g. at the top of app/layout.tsx or a root instrumentation file),
// and the whole app fails loudly at boot instead of failing confusingly
// later when some feature tries to use a Supabase client that was never
// configured.
//
// V1 note: GEMINI_API_KEY and UPSTASH_REDIS_* are in the schema below
// because PH0-002 lists them as required, but nothing in V1 actually calls
// Gemini (that's PH9-001/PH9-004, both V3) or rate-limits anything besides
// auth (login/reset already need Upstash for brute-force protection, so
// that one's real even in V1). If you genuinely don't have a Gemini key
// yet, you can loosen `GEMINI_API_KEY` to `.optional()` below until V3 —
// just don't forget to tighten it back before PH9-004 actually ships.

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  UPSTASH_REDIS_URL: z.string().url(),
  UPSTASH_REDIS_TOKEN: z.string().min(1),
  MONITOR_SECRET: z.string().min(16),
})

// PH0-002 AC: "SUPABASE_SERVICE_ROLE_KEY never appears in any NEXT_PUBLIC_*
// variable." This is enforced by convention (no NEXT_PUBLIC_ prefix on the
// service key above) plus the ESLint rule in .eslintrc.js — Zod alone can't
// catch "the key value happens to also be assigned to a public var
// somewhere else," that's a code-review/lint concern, not a schema one.

function loadEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(
      `\n\n❌ Missing or invalid environment variables:\n${missing}\n\nCopy .env.example to .env.local and fill in real values before starting the app.\n`
    )
  }
  return parsed.data
}

export const env = loadEnv()
