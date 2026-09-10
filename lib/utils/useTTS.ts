'use client'
// lib/utils/useTTS.ts
//
// Custom hook wrapping the Web Speech API (window.speechSynthesis) for
// K-5 read-aloud functionality. Every call to speak() cancels any
// active utterance first, preventing overlapping audio streams.
// Respects the app's reduced-motion / mute preferences.

import { useCallback, useEffect, useRef, useState } from 'react'

export function useTTS() {
    const [isSpeaking, setIsSpeaking] = useState(false)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

    const stop = useCallback(() => {
        if (typeof window === 'undefined') return
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
        utteranceRef.current = null
    }, [])

    const speak = useCallback(
        (text: string) => {
            if (typeof window === 'undefined' || !window.speechSynthesis) return

            // Always cancel first to prevent overlapping streams
            window.speechSynthesis.cancel()

            // Respect reduced-motion preferences
            const html = document.documentElement
            if (
                html.getAttribute('data-reduced-motion') === 'true' ||
                window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ) {
                return
            }

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.rate = 0.9 // Slightly slower for K-5 students
            utterance.pitch = 1.05

            utterance.onstart = () => setIsSpeaking(true)
            utterance.onend = () => {
                setIsSpeaking(false)
                utteranceRef.current = null
            }
            utterance.onerror = () => {
                setIsSpeaking(false)
                utteranceRef.current = null
            }

            utteranceRef.current = utterance
            window.speechSynthesis.speak(utterance)
        },
        []
    )

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined') {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    return { speak, stop, isSpeaking }
}
