import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { clientErrorRateLimit } from '@/lib/security/rate-limit';
// NOTE: `clientErrorRateLimit` needs to be added to lib/security/rate-limit.ts
// — it doesn't exist yet (only loginRateLimit + resetRateLimit were built so
// far). See the accompanying snippet for the one export to add.

export const dynamic = 'force-dynamic';

// Defense in depth: Zod enforces per-field limits, this catches an
// oversized/garbage body before we even attempt to parse JSON.
const MAX_BODY_BYTES = 20_000;
const MAX_MESSAGE = 500;
const MAX_STACK = 8_000;
const MAX_COMPONENT_STACK = 8_000;
const MAX_URL = 2_000;

const ClientErrorSchema = z.object({
    message: z.string().min(1).max(MAX_MESSAGE),
    stack: z.string().max(MAX_STACK).optional(),
    componentStack: z.string().max(MAX_COMPONENT_STACK).optional(),
    url: z.string().max(MAX_URL),
});

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Strips the one PII pattern that can plausibly show up in a JS error
 * message or stack trace: an email address embedded in interpolated text. */
function redactPII(input: string): string {
    return input.replace(EMAIL_RE, '[redacted-email]');
}

/** Keeps only the path. Query strings and hashes are the most common place
 * a token, email, or other identifier leaks into a URL. */
function sanitizeUrl(rawUrl: string): string {
    try {
        const parsed = new URL(rawUrl, 'http://placeholder.local');
        return parsed.pathname;
    } catch {
        return '[invalid-url]';
    }
}

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        '0.0.0.0'
    );
}

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);

    // Rate limit first — cheapest possible rejection before touching the body.
    const { success } = await clientErrorRateLimit.limit(`client-error:${ip}`);
    if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 400 });
    }

    let json: unknown;
    try {
        json = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = ClientErrorSchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { message, stack, componentStack, url } = parsed.data;

    // Structured log to stdout — matches the Type 2 "Application Logs" format
    // in LMS_ARCHITECTURE.md §10.1. Picked up automatically by Vercel Runtime
    // Logs; no separate log pipeline needed for V1.
    console.error(
        JSON.stringify({
            level: 'error',
            source: 'client-error-boundary',
            message: redactPII(message),
            stack: stack ? redactPII(stack) : undefined,
            componentStack: componentStack ? redactPII(componentStack) : undefined,
            route: sanitizeUrl(url),
            requestId: request.headers.get('x-vercel-id') ?? undefined,
            timestamp: new Date().toISOString(),
        })
    );

    return new NextResponse(null, { status: 204 });
}