import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { serverEnv } from "@/lib/env.server";

// Exported (not just module-local) so other files that need Redis for a
// non-rate-limit purpose — e.g. the PH1-003 activity debounce in
// middleware.ts — reuse this same connection instead of opening a second
// one with its own config.
export const redis = new Redis({
    url: serverEnv.UPSTASH_REDIS_REST_URL,
    token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
});

// See SECURITY.md §10 for the full rate limit table.
//
// Login is layered into two limiters, checked together (see login.ts) —
// a single flat window can't be both generous to a real person retrying
// a forgotten password AND strict enough to catch an attacker, since
// raising the count to be forgiving also raises the ceiling for brute
// force, and lowering it to stop brute force also locks out someone's mom.
//
//   - loginBurstRateLimit: forgiving, short window. Covers "typed the
//     wrong password 4-5 times in a row" without tripping.
//   - loginSustainedRateLimit: stricter, long window. Catches an
//     attacker who deliberately stays under the burst limit by spacing
//     attempts out (e.g. 1 every 90 seconds) — a real person never
//     needs 20+ attempts inside an hour, but a slow brute-force script
//     would.
//
// Both run on every attempt; either one failing blocks the login.
export const loginBurstRateLimit = new Ratelimit({
    redis,
    prefix: "ratelimit:login:burst",
    limiter: Ratelimit.slidingWindow(10, "5 m"),
});
export const loginSustainedRateLimit = new Ratelimit({
    redis,
    prefix: "ratelimit:login:sustained",
    limiter: Ratelimit.slidingWindow(20, "10 m"),
});

export const resetRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
});
// PH0-007 — POST /api/log/client-error: 20 requests / hour / IP.
export const clientErrorRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
});
// PHASE 8 CLEANUP FIX (2026-08-30, continued conversation): aiRateLimit
// removed — it existed for exactly one caller, AI Simplify's
// generateSimplifiedLessonForTeacher (features/simplify/actions/
// simplify.ts's aiRateLimit.limit(user.id) call), which was fully
// retired earlier this session (Phase 8). Confirmed no other caller
// before removing — everything else in this file (redis,
// loginBurstRateLimit/loginSustainedRateLimit, resetRateLimit,
// clientErrorRateLimit) is still live and untouched.