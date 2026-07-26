'use client'
// Searchable/filterable user list with deactivate, reactivate, and
// password-reset actions (PH2-002 full scope). Debounces search input
// by 300ms per the task's acceptance criteria.
import { useEffect, useState, useTransition, useCallback } from 'react'
import {
    listUsers,
    deactivateUser,
    reactivateUser,
    resetUserPassword,
    type UserRow,
} from '@/features/admin/actions/users'
import { EraseUserButton } from '@/features/admin/components/EraseUserButton'

export function UserList({ initialUsers }: { initialUsers: UserRow[] }) {
    const [users, setUsers] = useState(initialUsers)
    const [search, setSearch] = useState('')
    const [role, setRole] = useState<'all' | 'admin' | 'teacher' | 'student'>('all')
    const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
    const [isPending, startTransition] = useTransition()
    const [resetTargetId, setResetTargetId] = useState<string | null>(null)
    const [resetError, setResetError] = useState<string | null>(null)

    const refresh = useCallback(() => {
        startTransition(async () => {
            const result = await listUsers({ search, role, status })
            setUsers(result)
        })
    }, [search, role, status])

    // Debounce search/filter changes by 300ms, per PH2-002's acceptance
    // criteria ("results update as user types, debounced 300ms").
    useEffect(() => {
        const timer = setTimeout(refresh, 300)
        return () => clearTimeout(timer)
    }, [refresh])

    function handleDeactivate(userId: string) {
        startTransition(async () => {
            const result = await deactivateUser(userId)
            if (result.ok) refresh()
        })
    }

    function handleReactivate(userId: string) {
        startTransition(async () => {
            const result = await reactivateUser(userId)
            if (result.ok) refresh()
        })
    }

    async function handleResetPassword(formData: FormData) {
        setResetError(null)
        const result = await resetUserPassword(formData)
        if (result.ok) {
            setResetTargetId(null)
        } else {
            setResetError(result.error)
        }
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="flex-1 h-11 px-5 rounded-md border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                />
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as typeof role)}
                    className="h-11 px-4 rounded-md border border-hairline outline-none"
                >
                    <option value="all">All roles</option>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                </select>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="h-11 px-4 rounded-md border border-hairline outline-none"
                >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Deactivated</option>
                </select>
            </div>

            {users.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No users match these filters.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="bg-surface rounded-md shadow-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                            <div>
                                <p className="text-body-emphasis text-ink">{user.full_name}</p>
                                <p className="text-caption text-text-secondary">
                                    {user.email} · {user.role}
                                    {' · '}
                                    <span className={user.is_active ? 'text-success' : 'text-error'}>
                                        {user.is_active ? 'Active' : 'Deactivated'}
                                    </span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setResetTargetId(resetTargetId === user.id ? null : user.id)}
                                    className="h-9 px-4 rounded-md border border-hairline text-caption font-medium"
                                >
                                    Reset password
                                </button>
                                {user.is_active ? (
                                    <button
                                        onClick={() => handleDeactivate(user.id)}
                                        disabled={isPending}
                                        className="h-9 px-4 rounded-md border border-hairline text-caption font-medium disabled:opacity-60"
                                    >
                                        Deactivate
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleReactivate(user.id)}
                                        disabled={isPending}
                                        className="h-9 px-4 rounded-md border border-hairline text-caption font-medium disabled:opacity-60"
                                    >
                                        Reactivate
                                    </button>
                                )}
                                <EraseUserButton userId={user.id} fullName={user.full_name} />
                            </div>

                            {resetTargetId === user.id && (
                                <form
                                    action={handleResetPassword}
                                    className="w-full sm:basis-full flex flex-col sm:flex-row gap-2 mt-2"
                                >
                                    <input type="hidden" name="userId" value={user.id} />
                                    <input
                                        type="text"
                                        name="newPassword"
                                        required
                                        minLength={12}
                                        placeholder="New temporary password (12+ chars)"
                                        className="flex-1 h-10 px-4 rounded-md border border-hairline outline-none"
                                    />
                                    <button
                                        type="submit"
                                        className="h-10 px-4 rounded-md bg-ink text-on-ink text-caption font-medium"
                                    >
                                        Set password
                                    </button>
                                </form>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {resetError && (
                <p className="text-caption text-error mt-3" role="alert">
                    {resetError}
                </p>
            )}
        </div>
    )
}