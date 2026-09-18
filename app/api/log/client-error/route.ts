import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { clientErrorRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

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

function redactPII(input: string): string {
    return input.replace(EMAIL_RE, '[redacted-email]');
}

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