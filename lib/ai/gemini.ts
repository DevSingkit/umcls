// lib/ai/gemini.ts
//
// The single adapter that knows about Gemini's actual request/response
// shape (ADR-007, LMS_ARCHITECTURE.md §13.1). Nothing outside this file
// should import from '@google/generative-ai' or know the Gemini REST
// endpoint — lib/ai/provider.ts is the only caller.
//
// Uses plain fetch rather than the @google/generative-ai SDK to avoid
// adding a dependency for a single free-tier text-generation call.
// Swap to the SDK later if streaming or multi-turn chat is ever needed.

import { serverEnv } from '@/lib/env.server'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export class GeminiError extends Error {
    constructor(
        message: string,
        public readonly status?: number
    ) {
        super(message)
        this.name = 'GeminiError'
    }
}

export interface GeminiUsage {
    input_tokens: number | null
    output_tokens: number | null
}

export interface GeminiResult {
    text: string
    model: string
    usage: GeminiUsage
}

/**
 * Calls the Gemini API with a system prompt + user content, both already
 * prepared by the caller (delimiter-wrapping, truncation, etc. happen in
 * lib/ai/provider.ts — this function only knows how to talk to Gemini).
 *
 * Throws GeminiError on any non-2xx response or network failure. Callers
 * are responsible for catching this and returning a graceful 502.
 */
export async function callGemini(systemPrompt: string, userContent: string): Promise<GeminiResult> {
    const model = serverEnv.GEMINI_MODEL
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${serverEnv.GEMINI_API_KEY}`
    let response: Response
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: {
                    role: 'system',
                    parts: [{ text: systemPrompt }],
                },
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: userContent }],
                    },
                ],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.4,
                    maxOutputTokens: 2048,
                },
            }),
        })
    } catch (err) {
        throw new GeminiError('Network error calling Gemini API')
    }

    if (!response.ok) {
        // Don't leak raw Gemini error bodies to the client — log server-side only.
        console.error('Gemini API error:', response.status, await response.text().catch(() => ''))
        throw new GeminiError('Gemini API request failed', response.status)
    }

    const data = await response.json()

    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
        throw new GeminiError('Gemini API returned no content')
    }

    return {
        text,
        model,
        usage: {
            input_tokens: data?.usageMetadata?.promptTokenCount ?? null,
            output_tokens: data?.usageMetadata?.candidatesTokenCount ?? null,
        },
    }
}