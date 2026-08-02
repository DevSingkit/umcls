'use client'
// features/settings/components/ChangePasswordForm.tsx
import { useState } from 'react'
import { changePassword } from '@/features/settings/actions/settings'

export function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setStatus('saving')
        setError(null)

        const formData = new FormData()
        formData.set('currentPassword', currentPassword)
        formData.set('newPassword', newPassword)
        formData.set('confirmPassword', confirmPassword)

        const result = await changePassword(formData)
        if (result.ok) {
            setStatus('saved')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setTimeout(() => setStatus('idle'), 2000)
        } else {
            setStatus('error')
            setError(result.error)
        }
    }

    return (
        <section className="bg-surface rounded-md shadow-card p-6">
            <h2 className="font-heading text-h3 text-ink mb-4">Change password</h2>
            <form onSubmit={handleSubmit} className="grid gap-4 max-w-md">
                <div>
                    <label htmlFor="currentPassword" className="text-label text-ink block mb-1">
                        Current password
                    </label>
                    <input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full min-h-11 rounded-md border-[1.5px] border-hairline-strong bg-surface px-4 text-body-md text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                </div>

                <div>
                    <label htmlFor="newPassword" className="text-label text-ink block mb-1">
                        New password
                    </label>
                    <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full min-h-11 rounded-md border-[1.5px] border-hairline-strong bg-surface px-4 text-body-md text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                    <p className="text-caption text-text-secondary mt-1">
                        At least 12 characters, with an uppercase letter, a lowercase letter, and a number.
                    </p>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="text-label text-ink block mb-1">
                        Confirm new password
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                        {status === 'saving' ? 'Saving...' : 'Update password'}
                    </button>
                    {status === 'saved' && <span className="text-caption text-brand">Password updated</span>}
                </div>
            </form>
        </section>
    )
}
