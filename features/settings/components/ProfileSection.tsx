'use client'
// features/settings/components/ProfileSection.tsx
// Real file upload with live preview, avatar_url is a public URL
// (see settings.ts). Name is saved separately via updateProfile.

import { useRef, useState } from 'react'
import { updateProfile, uploadAvatar, removeAvatar } from '@/features/settings/actions/settings'

type ProfileSectionProps = {
    initialFullName: string
    initialEmail: string | null
    initialAvatarUrl: string | null
}

export function ProfileSection({ initialFullName, initialEmail, initialAvatarUrl }: ProfileSectionProps) {
    const [fullName, setFullName] = useState(initialFullName)
    const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [nameError, setNameError] = useState<string | null>(null)

    const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
    const [avatarStatus, setAvatarStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
    const [avatarError, setAvatarError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const initial = fullName?.trim()?.charAt(0)?.toUpperCase() || '?'

    async function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setNameStatus('saving')
        setNameError(null)

        const formData = new FormData()
        formData.set('fullName', fullName)

        const result = await updateProfile(formData)
        if (result.ok) {
            setNameStatus('saved')
            setTimeout(() => setNameStatus('idle'), 2000)
        } else {
            setNameStatus('error')
            setNameError(result.error)
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setAvatarStatus('uploading')
        setAvatarError(null)

        const formData = new FormData()
        formData.set('avatar', file)

        const result = await uploadAvatar(formData)
        if (result.ok) {
            setAvatarUrl(result.avatarUrl)
            setAvatarStatus('idle')
        } else {
            setAvatarStatus('error')
            setAvatarError(result.error)
        }

        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    async function handleRemove() {
        setAvatarStatus('uploading')
        setAvatarError(null)
        const result = await removeAvatar()
        if (result.ok) {
            setAvatarUrl(null)
            setAvatarStatus('idle')
        } else {
            setAvatarStatus('error')
            setAvatarError(result.error)
        }
    }

    return (
        <section className="bg-surface rounded-md shadow-card p-6">
            <h2 className="font-heading text-h3 text-ink mb-4">Your profile</h2>

            <div className="flex items-center gap-4 mb-6">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-h3 text-brand overflow-hidden">
                    {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- public storage URL
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                        initial
                    )}
                </span>

                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        disabled={avatarStatus === 'uploading'}
                        className="hidden"
                        id="avatarFile"
                    />
                    <div className="flex items-center gap-3">
                        <label
                            htmlFor="avatarFile"
                            className="inline-flex h-9 items-center rounded-md border-[1.5px] border-hairline-strong px-4 text-caption font-semibold text-ink cursor-pointer hover:bg-surface-sunken"
                        >
                            {avatarStatus === 'uploading' ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                        </label>
                        {avatarUrl && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={avatarStatus === 'uploading'}
                                className="text-caption text-text-secondary hover:text-error"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                    <p className="text-caption text-text-secondary mt-1">JPEG, PNG, or WEBP. Max 5 MB.</p>
                    {avatarError && <p className="text-caption text-error mt-1">{avatarError}</p>}
                </div>
            </div>

            <form onSubmit={handleNameSubmit} className="grid gap-4 max-w-md">
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

                {nameError && <p className="text-caption text-error">{nameError}</p>}

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={nameStatus === 'saving'}
                        className="h-11 px-6 rounded-md bg-brand text-on-ink text-body-md font-semibold hover:bg-brand-hover disabled:opacity-60"
                    >
                        {nameStatus === 'saving' ? 'Saving...' : 'Save changes'}
                    </button>
                    {nameStatus === 'saved' && <span className="text-caption text-brand">Saved</span>}
                </div>
            </form>
        </section>
    )
}
