'use client'
// "Erase User Data" confirmation modal — reversible soft delete, see
// erase-user.ts. Copy/behavior unchanged from the 2026-08-17 rework.
//
// DESIGN-LMS 2.1 migration: bg-red -> bg-error, h-11 -> h-12 (48px
// secondary floor), border -> border-2 border-hairline-strong,
// bg-black/40 -> bg-ink/40 (established overlay token).
import { useState } from 'react'
import { eraseUser } from '@/features/admin/actions/erase-user'

export function EraseUserModal({
    userId,
    fullName,
    isOpen,
    onClose,
    onErased,
}: {
    userId: string
    fullName: string
    isOpen: boolean
    onClose: () => void
    onErased: () => void
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function handleClose() {
        setError(null)
        onClose()
    }

    async function handleErase() {
        setIsSubmitting(true)
        setError(null)
        const result = await eraseUser(userId)
        setIsSubmitting(false)
        if (!result.ok) {
            setError(result.error)
            return
        }
        onErased()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-md shadow-modal p-6 max-w-md w-full">
                <p className="text-body-emphasis text-ink mb-2">Erase User Data for {fullName}?</p>
                <p className="text-body-md text-text-secondary mb-4">
                    This removes {fullName} from the main users list and signs them out. Their
                    name, email, login, and academic history all stay intact — nothing is
                    deleted. You can find and restore this account any time from{' '}
                    <span className="font-medium text-ink">Archives</span>.
                </p>
                {error && <p className="text-body-md text-error mb-4">{error}</p>}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={handleClose}
                        className="h-12 px-6 flex items-center rounded-md border-2 border-hairline-strong font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleErase}
                        disabled={isSubmitting}
                        className="h-12 px-6 flex items-center rounded-md bg-error text-on-ink font-medium disabled:opacity-40"
                    >
                        {isSubmitting ? 'Erasing…' : 'Erase User Data'}
                    </button>
                </div>
            </div>
        </div>
    )
}
