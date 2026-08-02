'use client'
// features/settings/components/ProfileSection.tsx
// Name + avatar editable, email shown but read-only (§7.7 forms rules:
// label above field, 16px minimum, never placeholder-only).
import { useState } from 'react'
import { updateProfile } from '@/features/settings/actions/settings'

type ProfileSectionProps = {
    initialFullName: string
    initialEmail: string | null
    initialAvatarUrl: string | null
}

export function ProfileSection({ initialFullName, initialEmail, initialAvatarUrl }: ProfileSectionProps) {
    const [fullName, setFullName] = useState(initialFullName)
    const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? '')
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setStatus('saving')
        setError(null)

        const formData = new FormData()
        formData.set('fullName', fullName)
        formData.set('avatarUrl', avatarUrl)

        const result = await updateProfile(formData)
        if (result.ok) {
            setStatus('saved')
            setTimeout(() => setStatus('idle'), 2000)
        } else {
            setStatus('error')
            setError(result.error)
        }
    }

    return (
        <section className="bg-surface rounded-md shadow-card p-6">
            <h2 className="font-heading text-h3 text-ink mb-4">Your profile</h2>
            <form onSubmit={handleSubmit} className="grid gap-4 max-w-md">
                <div>
                    <label htmlFor="fullName" className="text-label text-ink block mb-1">
                        Full name
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full min-h-11 rounded-md border-[1.5px] border-hairline-strong bg-surface px-4 text-body-md text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                </div>

                <div>
                    <label htmlFor="email" className="text-label text-ink block mb-1">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={initialEmail ?? ''}
                        readOnly
                        disabled
                        className="w-full min-h-11 rounded-md border-[1.5px] border-hairline bg-surface-sunken px-4 text-body-md text-text-secondary"
                    />
                    <p className="text-caption text-text-secondary mt-1">
                        Your email cannot be changed here. Ask your school admin if it needs to be updated.
                    </p>
                </div>

                <div>
                    <label htmlFor="avatarUrl" className="text-label text-ink block mb-1">
                        Photo link (optional)
                    </label>
                    <input
                        id="avatarUrl"
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full min-h-11 rounded-md border-[1.5px] border-hairline-strong bg-surface px-4 text-body-md text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                </div>

                {error && <p className="text-caption text-error">{error}</p>}

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={status === 'saving'}
                        className="h-11 px-6 rounded-md bg-brand text-on-ink text-body-md font-semibold hover:bg-brand-hover disabled:opacity-60"
                    >
                        {status === 'saving' ? 'Saving...' : 'Save changes'}
                    </button>
                    {status === 'saved' && <span className="text-caption text-brand">Saved</span>}
                </div>
            </form>
        </section>
    )
}
