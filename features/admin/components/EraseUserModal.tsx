'use client'
// "Erase User Data" confirmation modal.
//
// 2026-08-17 — REWORKED along with erase-user.ts: this used to warn
// "This cannot be undone" and require typing the exact full name,
// because the old eraseUser() genuinely, permanently anonymized the
// account and deleted its login. That's no longer true — eraseUser()
// is now a reversible soft delete (sets deleted_at only), restorable
// from the admin Archives page. The button/menu item is still labeled
// "Erase User Data" on purpose (day-to-day wording didn't change),
// but this modal's copy was corrected so it doesn't lie about
// permanence, and the type-to-confirm friction was removed since it
// no longer matches how serious/irreversible the action actually is —
// a plain confirm, same weight as Deactivate's, is now appropriate.
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
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
                        className="h-11 px-6 flex items-center rounded-md border border-hairline font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleErase}
                        disabled={isSubmitting}
                        className="h-11 px-6 flex items-center rounded-md bg-error text-on-ink font-medium disabled:opacity-40"
                    >
                        {isSubmitting ? 'Erasing…' : 'Erase User Data'}
                    </button>
                </div>
            </div>
        </div>
    )
}
