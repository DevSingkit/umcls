import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

// Exported (not just module-local) so other files that need Redis for a
// non-rate-limit purpose — e.g. the PH1-003 activity debounce in
// middleware.ts — reuse this same connection instead of opening a second
// one with its own config.
export const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
});

// See SECURITY.md §10 for the full rate limit table.
export const loginRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
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