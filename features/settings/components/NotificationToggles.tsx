'use client'
// features/settings/components/NotificationToggles.tsx
// Three simple on/off switches. Plain words, no "notification types" or
// system terminology — just what a parent/teacher would recognize.
import { useState } from 'react'
import { updateNotificationPreferences } from '@/features/settings/actions/settings'

type NotificationTogglesProps = {
    initial: {
        commentsEnabled: boolean
        gradesEnabled: boolean
        newLessonsEnabled: boolean
    }
}

type ToggleRowProps = {
    label: string
    description: string
    checked: boolean
    onChange: (checked: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div>
                <p className="text-body-emphasis text-ink">{label}</p>
                <p className="text-caption text-text-secondary">{description}</p>
            </div>
            {/*
                Built to DESIGN-LMS.md §7.1b's fixed proportions, not
                eyeballed per instance — this is the exact bug that
                section documents: sizing track/border/knob
                independently silently breaks the math as soon as a
                border is added.
                  - Track: h-6 w-11 (24x44px), border is part of the
                    track's own box, not layered on top.
                  - Knob: h-4 w-4 (16x16px), anchored with BOTH top-0.5
                    and left-0.5 — omitting left-0.5 lets the browser's
                    default left:0 sit the knob flush against the
                    border with no room to slide.
                  - Slide distance: translate-x-5 (20px), derived from
                    track inner width (42px) minus knob width (16px)
                    minus the knob's own 2px left anchor, leaving 2px
                    clearance on both edges.
                  - Off-state: bg-hairline fill + border-hairline-strong
                    — never a bare hairline-strong fill alone (too
                    close to canvas/surface-sunken, reads as active).
            */}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                className={`relative h-6 w-11 shrink-0 rounded-pill border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                    checked ? 'bg-brand border-brand' : 'bg-hairline border-hairline-strong'
                }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-pill bg-surface transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    )
}

export function NotificationToggles({ initial }: NotificationTogglesProps) {
    const [prefs, setPrefs] = useState(initial)
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    async function save(next: typeof prefs) {
        setPrefs(next)
        setStatus('saving')
        const result = await updateNotificationPreferences(next)
        setStatus(result.ok ? 'saved' : 'error')
        if (result.ok) {
            setTimeout(() => setStatus('idle'), 1500)
        }
    }

    return (
        <section className="bg-surface rounded-md shadow-card p-6">
            <h2 className="text-h3 text-ink mb-2">Notifications</h2>
            <p className="text-caption text-text-secondary mb-2">
                Choose what you want to be notified about.
            </p>
            <div className="divide-y divide-hairline max-w-md">
                <ToggleRow
                    label="Comments"
                    description="When someone comments on a lesson"
                    checked={prefs.commentsEnabled}
                    onChange={(checked) => save({ ...prefs, commentsEnabled: checked })}
                />
                <ToggleRow
                    label="Grades"
                    description="When your work is graded"
                    checked={prefs.gradesEnabled}
                    onChange={(checked) => save({ ...prefs, gradesEnabled: checked })}
                />
                <ToggleRow
                    label="New lessons"
                    description="When a new lesson is added to your course"
                    checked={prefs.newLessonsEnabled}
                    onChange={(checked) => save({ ...prefs, newLessonsEnabled: checked })}
                />
            </div>
            {status === 'error' && (
                <p className="text-caption text-error mt-2">Could not save. Please try again.</p>
            )}
        </section>
    )
}
