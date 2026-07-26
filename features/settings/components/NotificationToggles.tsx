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
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                className={`relative h-8 w-14 shrink-0 rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                    checked ? 'bg-brand' : 'bg-hairline-strong'
                }`}
            >
                <span
                    className={`absolute top-1 h-6 w-6 rounded-pill bg-surface shadow-card transition-transform ${
                        checked ? 'translate-x-7' : 'translate-x-1'
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
            <h2 className="font-heading text-h3 text-ink mb-2">Notifications</h2>
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
