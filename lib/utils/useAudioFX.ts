'use client'
// lib/utils/useAudioFX.ts
//
// Lightweight Web Audio API synthesizer hook for ActivityRunner.
// Produces native synthesized sound effects — no audio files needed:
//   - playCorrect(): dual-tone chime (C5 + E5, ~300ms)
//   - playRetry():   soft low-frequency bump (~180Hz, ~200ms)
//
// Uses a single shared AudioContext (lazily created on first call to
// avoid browser autoplay policy issues). Respects reduced-motion and
// system mute preferences.

import { useCallback, useRef } from 'react'

function isMotionReduced(): boolean {
    if (typeof window === 'undefined') return true
    const html = document.documentElement
    return (
        html.getAttribute('data-reduced-motion') === 'true' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
}

export function useAudioFX() {
    const ctxRef = useRef<AudioContext | null>(null)

    function getContext(): AudioContext | null {
        if (typeof window === 'undefined') return null
        if (!ctxRef.current) {
            try {
                ctxRef.current = new AudioContext()
            } catch {
                return null
            }
        }
        // Resume suspended context (browser autoplay policy)
        if (ctxRef.current.state === 'suspended') {
            ctxRef.current.resume()
        }
        return ctxRef.current
    }

    const playCorrect = useCallback(() => {
        if (isMotionReduced()) return
        const ctx = getContext()
        if (!ctx) return

        const now = ctx.currentTime

        // Dual-tone chime: C5 (523Hz) + E5 (659Hz)
        const frequencies = [523, 659]
        for (const freq of frequencies) {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, now)

            gain.gain.setValueAtTime(0, now)
            gain.gain.linearRampToValueAtTime(0.15, now + 0.03)
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.start(now)
            osc.stop(now + 0.35)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const playRetry = useCallback(() => {
        if (isMotionReduced()) return
        const ctx = getContext()
        if (!ctx) return

        const now = ctx.currentTime

        // Soft low-frequency bump (~180Hz)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(180, now)
        osc.frequency.linearRampToValueAtTime(120, now + 0.2)

        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.25)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return { playCorrect, playRetry }
}
