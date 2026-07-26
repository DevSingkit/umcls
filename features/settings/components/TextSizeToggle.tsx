'use client'
// features/settings/components/TextSizeToggle.tsx
// Two big, obvious buttons rather than a slider or dropdown — this
// audience (parents 40-60, non-technical) benefits from "big, obvious,
// few" over a more compact but less discoverable control (§1).
import { useState } from 'react'
import { updateTextSizePreference } from '@/features/settings/actions/settings'

type TextSizeToggleProps = {
    initial: 'normal' | 'larger'
}

export function TextSizeToggle({ initial }: TextSizeToggleProps) {
    const [textSize, setTextSize] = useState(initial)
    const [saving, setSaving] = useState(false)

    async function choose(size: 'normal' | 'larger') {
        if (size === textSize) return
        setTextSize(size)
        setSaving(true)
        await updateTextSizePreference(size)
        setSaving(false)
        // Applies immediately for this session too, not just on next
        // load — a data attribute on <html> that globals.css can key off
        // of, without needing a full page reload.
        document.documentElement.dataset.textSize = size
    }

    return (
        <section className="bg-surface rounded-md shadow-card p-6">
            <h2 className="font-heading text-h3 text-ink mb-2">Text size</h2>
            <p className="text-caption text-text-secondary mb-4">
                Make the words on the screen easier to read.
            </p>
            <div className="flex gap-3 max-w-md">
                <button
                    type="button"
                    onClick={() => choose('normal')}
                    disabled={saving}
                    aria-pressed={textSize === 'normal'}
                    className={`flex-1 h-14 rounded-md border-[1.5px] text-body-md font-semibold ${
                        textSize === 'normal'
                            ? 'border-brand bg-brand-soft text-brand'
                            : 'border-hairline-strong bg-surface text-ink hover:bg-surface-sunken'
                    }`}
                >
                    Normal
                </button>
                <button
                    type="button"
                    onClick={() => choose('larger')}
                    disabled={saving}
                    aria-pressed={textSize === 'larger'}
                    className={`flex-1 h-14 rounded-md border-[1.5px] text-body-lg font-semibold ${
                        textSize === 'larger'
                            ? 'border-brand bg-brand-soft text-brand'
                            : 'border-hairline-strong bg-surface text-ink hover:bg-surface-sunken'
                    }`}
                >
                    Larger
                </button>
            </div>
        </section>
    )
}
