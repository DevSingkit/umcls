'use client'
// Erase User Data button + confirmation modal (PH2-SEC-01). The erase
// button only becomes clickable once the admin types the exact full
// name of the person being erased, making this hard to trigger by
// accident, since this action cannot be undone.
import { useState } from 'react'
import { eraseUser } from '@/features/admin/actions/erase-user'

export function EraseUserButton({ userId, fullName }: { userId: string; fullName: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [typedName, setTypedName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    const nameMatches = typedName.trim() === fullName.trim()

    function openModal() {
        setIsOpen(true)
        setTypedName('')
        setError(null)
    }

    function closeModal() {
        setIsOpen(false)
        setTypedName('')
        setError(null)
    }

    async function handleErase() {
        if (!nameMatches) return
        setIsSubmitting(true)
        setError(null)
        const result = await eraseUser(userId)
        setIsSubmitting(false)
        if (!result.ok) {
            setError(result.error)
            return
        }
        setDone(true)
        setIsOpen(false)
    }

    if (done) {
        return <span className="text-caption text-text-secondary">Account erased.</span>
    }

    return (
        <>
            <button
                onClick={openModal}
                className="h-9 px-4 flex items-center rounded-md border border-error text-error font-medium"
            >
                Erase User Data
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-md shadow-modal p-6 max-w-md w-full">
                        <p className="text-body-emphasis text-ink mb-2">Erase this account?</p>
                        <p className="text-body-md text-text-secondary mb-4">
                            This removes {fullName}&apos;s name, email, and login access for good.
                            Their quiz scores and lesson history stay, but with no name attached
                            to them anymore. This cannot be undone.
                        </p>
                        <p className="text-caption text-text-secondary mb-2">
                            Type the full name <span className="text-ink font-medium">{fullName}</span> to
                            confirm.
                        </p>
                        <input
                            type="text"
                            value={typedName}
                            onChange={(event) => setTypedName(event.target.value)}
                            className="w-full h-11 px-4 rounded-md border border-hairline mb-4"
                            placeholder="Type the full name here"
                        />
                        {error && <p className="text-body-md text-error mb-4">{error}</p>}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={closeModal}
                                className="h-11 px-6 flex items-center rounded-md border border-hairline font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleErase}
                                disabled={!nameMatches || isSubmitting}
                                className="h-11 px-6 flex items-center rounded-md bg-error text-on-ink font-medium disabled:opacity-40"
                            >
                                {isSubmitting ? 'Erasing...' : 'Erase permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}