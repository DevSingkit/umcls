'use client'
// List of deleted (soft-deleted) user accounts with a Restore action,
// for the admin Archives page. Mirrors AdminCourseList.tsx's exact
// pattern — client state for immediate feedback, per-row error
// surfacing, no silent failures.

import { useState, useTransition } from 'react'
import { restoreUser } from '@/features/admin/actions/erase-user'
import type { ArchivedUserRow } from '@/features/admin/actions/users'

export function DeletedUsersList({ initialUsers }: { initialUsers: ArchivedUserRow[] }) {
    const [users, setUsers] = useState(initialUsers)
    const [isPending, startTransition] = useTransition()
    const [errorByUserId, setErrorByUserId] = useState<Record<string, string>>({})

    function handleRestore(userId: string) {
        setErrorByUserId((prev) => ({ ...prev, [userId]: '' }))
        startTransition(async () => {
            const result = await restoreUser(userId)
            if (result.ok) {
                setUsers((prev) => prev.filter((u) => u.id !== userId))
            } else {
                setErrorByUserId((prev) => ({ ...prev, [userId]: result.error }))
            }
        })
    }

    if (users.length === 0) {
        return (
            <div className="bg-surface rounded-md shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary">No deleted accounts.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-3">
            {users.map((user) => (
                <div
                    key={user.id}
                    className="bg-surface rounded-md shadow-card p-5 flex flex-col gap-3"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="text-body-emphasis text-ink">{user.full_name}</p>
                            <p className="text-caption text-text-secondary">
                                {user.email} · {user.role}
                                {' · '}
                                <span className="text-error">
                                    Deleted {new Date(user.deletedAt).toLocaleDateString()}
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={() => handleRestore(user.id)}
                            disabled={isPending}
                            className="h-9 px-4 rounded-md bg-brand text-on-ink text-caption font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 shrink-0"
                        >
                            Restore
                        </button>
                    </div>
                    {errorByUserId[user.id] && (
                        <p className="text-caption text-error" role="alert">
                            {errorByUserId[user.id]}
                        </p>
                    )}
                </div>
            ))}
        </div>
    )
}
