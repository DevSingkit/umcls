'use client'
// lib/utils/useAudioFX.ts
//
// Kid-Friendly Web Audio API synthesizer hook for ActivityRunner.
// Designed with bright timbres (triangle/square waves), dynamic pitch sweeps,
// and rhythmic layering specifically tailored for elementary school engagement.

import { useCallback, useRef } from 'react'

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
        if (ctxRef.current.state === 'suspended') {
            ctxRef.current.resume()
        }
        return ctxRef.current
    }

    /**
     * Playful "Ding-Ding!" / Coin Collect Sound
     * Fast upward pitch chirp using a bright triangle wave.
     */
    const playCorrect = useCallback(() => {
        const ctx = getContext()
        if (!ctx) return

        const now = ctx.currentTime

        // Note 1: High crisp chirp (C6 -> D6 sweep)
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'triangle'
        osc1.frequency.setValueAtTime(1046.5, now) // C6
        osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08) // D6

        gain1.gain.setValueAtTime(0, now)
        gain1.gain.linearRampToValueAtTime(0.25, now + 0.01)
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

        osc1.connect(gain1)
        gain1.connect(ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.12)

        // Note 2: Bright sparkle landing (G6)
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'triangle'
        osc2.frequency.setValueAtTime(1567.98, now + 0.08) // G6

        gain2.gain.setValueAtTime(0, now + 0.08)
        gain2.gain.linearRampToValueAtTime(0.28, now + 0.09)
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start(now + 0.08)
        osc2.stop(now + 0.35)
    }, [])

    /**
     * Friendly "Uh-Oh / Bouncy Boing"
     * Playful descending pitch slide — encouraging rather than harsh or punitive.
     */
    const playRetry = useCallback(() => {
        const ctx = getContext()
        if (!ctx) return

        const now = ctx.currentTime

        // Oscillator 1: Soft cartoonish pitch slide (220Hz -> 140Hz)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        // Lowpass filter softens the square wave so it sounds rubbery/bouncy
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(800, now)

        osc.type = 'square'
        osc.frequency.setValueAtTime(220, now) // A3
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.22) // ~C3

        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.18, now + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.25)
    }, [])

    /**
     * Triumphant Victory Fanfare & Sparkle
     * Fast 5-note arcade sequence ending in a shimmering chord flourish.
     */
    const playMastery = useCallback(() => {
        const ctx = getContext()
        if (!ctx) return

        const now = ctx.currentTime

        // Arpeggio notes: C5, E5, G5, C6
        const arpeggio = [
            { freq: 523.25, timeOffset: 0.00 },  // C5
            { freq: 659.25, timeOffset: 0.07 },  // E5
            { freq: 783.99, timeOffset: 0.14 },  // G5
            { freq: 1046.5, timeOffset: 0.21 },  // C6
        ]

        arpeggio.forEach(({ freq, timeOffset }) => {
            const start = now + timeOffset
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            osc.type = 'triangle'
            osc.frequency.setValueAtTime(freq, start)

            gain.gain.setValueAtTime(0, start)
            gain.gain.linearRampToValueAtTime(0.22, start + 0.015)
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)

            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.start(start)
            osc.stop(start + 0.3)
        })

        // Grand Finale Chord at the end (C6 + E6 + G6 + C7 high twinkle)
        const chordStart = now + 0.28
        const finalNotes = [1046.5, 1318.5, 1567.98, 2093.00]

        finalNotes.forEach((freq) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            osc.type = 'triangle'
            osc.frequency.setValueAtTime(freq, chordStart)

            gain.gain.setValueAtTime(0, chordStart)
            gain.gain.linearRampToValueAtTime(0.18, chordStart + 0.03)
            gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 0.6)

            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.start(chordStart)
            osc.stop(chordStart + 0.6)
        })
    }, [])

    return { playCorrect, playRetry, playMastery }
}