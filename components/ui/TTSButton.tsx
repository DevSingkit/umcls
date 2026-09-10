'use client'
// components/ui/TTSButton.tsx
//
// Reusable "Read aloud" button for K-5 accessibility. Renders a
// Lucide Volume2/VolumeX icon button with 56px minimum touch target.
// Toggle behavior: tap to start speaking, tap again to stop.

import { Volume2, VolumeX } from 'lucide-react'
import { useTTS } from '@/lib/utils/useTTS'

interface TTSButtonProps {
    /** The text content to speak aloud */
    text: string
    /** Optional additional CSS classes */
    className?: string
}

export function TTSButton({ text, className = '' }: TTSButtonProps) {
    const { speak, stop, isSpeaking } = useTTS()

    function handleClick() {
        if (isSpeaking) {
            stop()
        } else {
            speak(text)
        }
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
            className={`inline-flex items-center justify-center min-h-touch min-w-touch
                        rounded-pill transition-colors shrink-0
                        ${isSpeaking
                    ? 'bg-brand text-on-ink shadow-card'
                    : 'bg-surface-sunken text-ink-soft hover:bg-hairline hover:text-ink'
                } ${className}`}
        >
            {isSpeaking ? (
                <VolumeX size={22} aria-hidden="true" />
            ) : (
                <Volume2 size={22} aria-hidden="true" />
            )}
        </button>
    )
}
