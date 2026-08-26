'use client'
// List of deleted (soft-deleted) user accounts with a Restore action,
// for the admin Archives page. Mirrors AdminCourseList.tsx's pattern —
// client state for immediate feedback, per-row error surfacing.
//
// Design pass: deletion status now shows as a real §7.3 badge next to
// the name, instead of being folded into the metadata caption as plain
// colored text. Restore stays a single click (no confirm modal) since
// it's a reversible, low-risk action, same reasoning as Reactivate.

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
                        <div className="flex items-center gap-3 flex-wrap">
                            <div>
                                <p className="text-body-emphasis text-ink">{user.full_name}</p>
                                <p className="text-caption text-text-secondary">
                                    {user.email} · {user.role}
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-pill bg-red-soft px-3 py-1 text-caption font-semibold text-red">
                                <span className="h-1.5 w-1.5 rounded-pill bg-red" aria-hidden="true" />
                                Deleted {new Date(user.deletedAt).toLocaleDateString()}
                            </span>
                        </div>
                        <button
                            onClick={() => handleRestore(user.id)}
                            disabled={isPending}
                            className="h-11 px-6 rounded-md bg-brand text-on-ink font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 shrink-0"
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