'use client'
// lib/utils/useTTS.ts
//
// Free, Zero-Cost Browser TTS Hook optimized for K-5 EdTech.
// Explicitly targets high-quality free Neural/Online voices built into modern browsers
// and injects natural speech cadence (micro-pauses, math expansion, fill-in-the-blank handling).

import { useCallback, useEffect, useRef, useState } from 'react'

export function useTTS() {
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

    // Load available voices asynchronously
    const loadVoices = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return
        const available = window.speechSynthesis.getVoices()
        if (available.length > 0) {
            setVoices(available)
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return

        loadVoices()
        window.speechSynthesis.onvoiceschanged = loadVoices

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null
            }
        }
    }, [loadVoices])

    /**
     * Prioritizes high-quality FREE "Online", "Natural", or "Neural" voices provided by
     * Chrome, Edge, Safari, and Android, while filtering out old offline robotic voices.
     */
    const selectBestFreeVoice = useCallback((): SpeechSynthesisVoice | null => {
        const currentVoices = voices.length > 0 
            ? voices 
            : (typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.getVoices() : [])

        if (currentVoices.length === 0) return null

        // 1. Check for native Tagalog / Taglish voices if available on device
        const filipinoVoice = currentVoices.find(v => 
            v.lang.startsWith('tl') || 
            v.lang.startsWith('fil') || 
            v.lang.includes('PH') || 
            v.name.toLowerCase().includes('filipino') || 
            v.name.toLowerCase().includes('tagalog')
        )
        if (filipinoVoice) return filipinoVoice

        // 2. High-priority list: Free, realistic online/natural voices built into browsers
        const premiumVoiceKeywords = [
            'Microsoft Jenny Online (Natural)',          // Modern Edge (sounds like a real teacher)
            'Microsoft Aria Online (Natural)',           // High-energy Edge voice
            'Microsoft Ana Online (Natural)',            // Youthful/child-like voice
            'Google US English',                         // High-quality Chrome voice
            'Samantha',                                  // iOS/macOS clear, friendly voice
            'Victoria',                                  // iOS/macOS expressive voice
            'Karen',                                     // Clear Australian/English voice
            'Microsoft Zira',                            // Standard Windows female voice
        ]

        for (const keyword of premiumVoiceKeywords) {
            const found = currentVoices.find(v => v.name.includes(keyword))
            if (found) return found
        }

        // 3. Look for any voice with "Natural", "Online", or "Neural" in the title
        const anyNaturalVoice = currentVoices.find(v => {
            const name = v.name.toLowerCase()
            return v.lang.startsWith('en') && (name.includes('natural') || name.includes('online') || name.includes('neural'))
        })
        if (anyNaturalVoice) return anyNaturalVoice

        // 4. Blacklist old legacy offline robotic engines (David, Mark, eSpeak, etc.)
        const nonRoboticVoices = currentVoices.filter(v => {
            const lower = v.name.toLowerCase()
            const isEnglish = v.lang.startsWith('en')
            const isRobotic = 
                lower.includes('david') || 
                lower.includes('mark') || 
                lower.includes('alex') || 
                lower.includes('george') || 
                lower.includes('fred') || 
                lower.includes('espeak') ||
                lower.includes('desktop') // Windows legacy desktop voices

            return isEnglish && !isRobotic
        })

        if (nonRoboticVoices.length > 0) {
            return nonRoboticVoices[0] ?? null
        }

        // 5. Fallback to first available English voice
        return currentVoices.find(v => v.lang.startsWith('en')) ?? currentVoices[0] ?? null
    }, [voices])

    /**
     * Pre-processes text to add expressive breathing, speech pacing, and clear math/blank expansions.
     */
    const formatTextForKidTTS = (input: string): string => {
        if (!input) return ''

        return input
            // Remove markdown/HTML tags that break speech flow
            .replace(/[\*\#\~\`]/g, '')
            .replace(/<[^>]*>/g, '')

            // Fill-in-the-blank: Add pauses around "blank"
            .replace(/(_+|-{2,})/g, '... blank ...')

            // Inject soft breathing pauses around logical connectors
            .replace(/\b(and|but|so|because|then|also)\b/gi, ', $1')

            // Math expressions expansion
            .replace(/\+/g, ' plus ')
            .replace(/-(?=\s|\d)/g, ' minus ')
            .replace(/\=/g, ' ... equals ... ')
            .replace(/×/g, ' times ')
            .replace(/÷/g, ' divided by ')

            // Standardize spaces
            .replace(/\s+/g, ' ')
            .trim()
    }

    const stop = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
        utteranceRef.current = null
    }, [])

    const speak = useCallback(
        (text: string) => {
            if (typeof window === 'undefined' || !window.speechSynthesis) return

            window.speechSynthesis.cancel()

            const cleanedText = formatTextForKidTTS(text)
            const utterance = new SpeechSynthesisUtterance(cleanedText)
            
            const chosenVoice = selectBestFreeVoice()
            if (chosenVoice) {
                utterance.voice = chosenVoice
            }

            // Pacing tuned specifically for ESL / Filipino K-5 students
            utterance.rate = 0.72   // Slower pacing makes free TTS voices sound smoother
            utterance.pitch = 1.80  // Slightly elevated pitch for warmth without distortion
            utterance.volume = 1.0

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
        [selectBestFreeVoice]
    )

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    return { speak, stop, isSpeaking }
}