'use client'

import { useState, useEffect } from 'react'
import { updateAccessibilityPreferences, type AccessibilityPrefs } from '@/features/settings/actions/settings'

type AccessibilitySettingsProps = {
    initialTextSize: 'normal' | 'larger'
    initialHighContrast: boolean
    initialReducedMotion: boolean
}

export function AccessibilitySettings({
    initialTextSize,
    initialHighContrast,
    initialReducedMotion,
}: AccessibilitySettingsProps) {
    const [prefs, setPrefs] = useState<AccessibilityPrefs>({
        textSize: initialTextSize,
        highContrast: initialHighContrast,
        reducedMotion: initialReducedMotion,
    })
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    useEffect(() => {
        document.documentElement.dataset.textSize = prefs.textSize
        document.documentElement.dataset.highContrast = String(prefs.highContrast)
        document.documentElement.dataset.reducedMotion = String(prefs.reducedMotion)
    }, [prefs])

    async function save(next: AccessibilityPrefs) {
        setPrefs(next)
        setStatus('saving')

        // Apply immediately to current DOM session
        document.documentElement.dataset.textSize = next.textSize
        document.documentElement.dataset.highContrast = String(next.highContrast)
        document.documentElement.dataset.reducedMotion = String(next.reducedMotion)

        const result = await updateAccessibilityPreferences(next)
        setStatus(result.ok ? 'saved' : 'error')
        if (result.ok) {
            setTimeout(() => setStatus('idle'), 1500)
        }
    }

    return (
        <section className="bg-surface rounded-md shadow-card p-6">
            <h2 className="text-h3 text-ink mb-2">Accessibility</h2>
            <p className="text-caption text-text-secondary mb-6">
                Customize reading size, contrast, and motion settings to make learning comfortable.
            </p>

            <div className="space-y-6 max-w-md">
                {/* Text Size */}
                <div>
                    <label className="text-body-emphasis text-ink block mb-1">Text size</label>
                    <p className="text-caption text-text-secondary mb-3">Adjust font size across all pages.</p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => save({ ...prefs, textSize: 'normal' })}
                            aria-pressed={prefs.textSize === 'normal'}
                            className={`flex-1 h-12 rounded-md border-2 text-body-md font-semibold transition-colors ${
                                prefs.textSize === 'normal'
                                    ? 'border-brand bg-brand-soft text-brand'
                                    : 'border-hairline bg-surface text-ink hover:bg-surface-sunken'
                            }`}
                        >
                            Normal
                        </button>
                        <button
                            type="button"
                            onClick={() => save({ ...prefs, textSize: 'larger' })}
                            aria-pressed={prefs.textSize === 'larger'}
                            className={`flex-1 h-12 rounded-md border-2 text-body-lg font-semibold transition-colors ${
                                prefs.textSize === 'larger'
                                    ? 'border-brand bg-brand-soft text-brand'
                                    : 'border-hairline bg-surface text-ink hover:bg-surface-sunken'
                            }`}
                        >
                            Larger
                        </button>
                    </div>
                </div>

                {/* High Contrast */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-hairline">
                    <div>
                        <p className="text-body-emphasis text-ink">High contrast mode</p>
                        <p className="text-caption text-text-secondary">Increase element borders and text contrast.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.highContrast}
                        aria-label="High contrast mode"
                        onClick={() => save({ ...prefs, highContrast: !prefs.highContrast })}
                        className={`relative h-6 w-11 shrink-0 rounded-pill border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                            prefs.highContrast ? 'bg-brand border-brand' : 'bg-hairline border-hairline-strong'
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-pill bg-surface transition-transform ${
                                prefs.highContrast ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                {/* Reduced Motion */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-hairline">
                    <div>
                        <p className="text-body-emphasis text-ink">Reduce motion & animations</p>
                        <p className="text-caption text-text-secondary">Disable unnecessary transition animations.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.reducedMotion}
                        aria-label="Reduce motion and animations"
                        onClick={() => save({ ...prefs, reducedMotion: !prefs.reducedMotion })}
                        className={`relative h-6 w-11 shrink-0 rounded-pill border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                            prefs.reducedMotion ? 'bg-brand border-brand' : 'bg-hairline border-hairline-strong'
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-pill bg-surface transition-transform ${
                                prefs.reducedMotion ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>
            </div>

            {status === 'error' && (
                <p className="text-caption text-error mt-4">Could not save accessibility settings. Please try again.</p>
            )}
        </section>
    )
}
