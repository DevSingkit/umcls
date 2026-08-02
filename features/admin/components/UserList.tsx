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
    updateUserProfile,
    getUserRoleChangeEligibility,
    changeUserRole,
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
    const [editTargetId, setEditTargetId] = useState<string | null>(null)
    const [editError, setEditError] = useState<string | null>(null)
    const [roleTargetId, setRoleTargetId] = useState<string | null>(null)
    const [roleError, setRoleError] = useState<string | null>(null)
    const [roleCheckPending, setRoleCheckPending] = useState(false)
    const [toggleActiveError, setToggleActiveError] = useState<string | null>(null)

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
        setToggleActiveError(null)
        startTransition(async () => {
            const result = await deactivateUser(userId)
            if (result.ok) {
                refresh()
            } else {
                setToggleActiveError(result.error)
            }
        })
    }

    function handleReactivate(userId: string) {
        setToggleActiveError(null)
        startTransition(async () => {
            const result = await reactivateUser(userId)
            if (result.ok) {
                refresh()
            } else {
                setToggleActiveError(result.error)
            }
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

    async function handleEditProfile(formData: FormData) {
        setEditError(null)
        const result = await updateUserProfile(formData)
        if (result.ok) {
            setEditTargetId(null)
            refresh()
        } else {
            setEditError(result.error)
        }
    }

    // Checks eligibility BEFORE opening the role control — a user with
    // existing courses/submissions never even sees a role dropdown,
    // they see the reason why not, directly. changeUserRole re-checks
    // this itself server-side regardless (see users.ts's own comment on
    // why), this is purely about not showing a control that's about to
    // fail anyway.
    async function handleOpenRoleChange(userId: string) {
        setRoleError(null)
        if (roleTargetId === userId) {
            setRoleTargetId(null)
            return
        }
        setRoleCheckPending(true)
        const eligibility = await getUserRoleChangeEligibility(userId)
        setRoleCheckPending(false)
        if (!eligibility.eligible) {
            setRoleError(eligibility.reason)
            return
        }
        setRoleTargetId(userId)
    }

    function handleChangeRole(userId: string, newRole: 'admin' | 'teacher' | 'student') {
        setRoleError(null)
        startTransition(async () => {
            const result = await changeUserRole(userId, newRole)
            if (result.ok) {
                setRoleTargetId(null)
                refresh()
            } else {
                setRoleError(result.error)
            }
        })
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="flex-1 h-11 px-5 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as typeof role)}
                    className="h-11 px-4 rounded-md border border-hairline-strong bg-surface outline-none focus:border-[1.5px] focus:border-brand focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <option value="all">All roles</option>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                </select>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="h-11 px-4 rounded-md border border-hairline-strong bg-surface outline-none focus:border-[1.5px] focus:border-brand focus-visible:ring-2 focus-visible:ring-brand"
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
                            className="bg-surface rounded-md shadow-card p-5 flex flex-col gap-3"
                        >
                        {/* Header row: name + action buttons. Always its own row,
                            never sharing flex space with the expand sections below
                            — that mixing is what caused the button-squeeze/wrap
                            bug when Edit/Reset password/Change role were open. */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => {
                                        setEditTargetId(editTargetId === user.id ? null : user.id)
                                        setEditError(null)
                                    }}
                                    className={`h-9 px-4 rounded-md border-[1.5px] text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                        editTargetId === user.id
                                            ? 'border-brand bg-brand text-on-ink hover:bg-brand-hover'
                                            : 'border-hairline-strong bg-surface text-ink hover:bg-surface-sunken'
                                    }`}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleOpenRoleChange(user.id)}
                                    disabled={roleCheckPending}
                                    className={`h-9 px-4 rounded-md border-[1.5px] text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 ${
                                        roleTargetId === user.id
                                            ? 'border-brand bg-brand text-on-ink hover:bg-brand-hover'
                                            : 'border-hairline-strong bg-surface text-ink hover:bg-surface-sunken'
                                    }`}
                                >
                                    {roleCheckPending ? 'Checking…' : 'Change role'}
                                </button>
                                <button
                                    onClick={() => setResetTargetId(resetTargetId === user.id ? null : user.id)}
                                    className={`h-9 px-4 rounded-md border-[1.5px] text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                        resetTargetId === user.id
                                            ? 'border-brand bg-brand text-on-ink hover:bg-brand-hover'
                                            : 'border-hairline-strong bg-surface text-ink hover:bg-surface-sunken'
                                    }`}
                                >
                                    Reset password
                                </button>
                                {user.is_active ? (
                                    <button
                                        onClick={() => handleDeactivate(user.id)}
                                        disabled={isPending}
                                        className="h-9 px-4 rounded-md border-[1.5px] border-error bg-surface text-error text-caption font-medium hover:bg-error-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                                    >
                                        Deactivate
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleReactivate(user.id)}
                                        disabled={isPending}
                                        className="h-9 px-4 rounded-md bg-brand text-on-ink text-caption font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                                    >
                                        Reactivate
                                    </button>
                                )}
                                <EraseUserButton userId={user.id} fullName={user.full_name} />
                            </div>
                        </div>

                            {resetTargetId === user.id && (
                                <form
                                    action={handleResetPassword}
                                    className="flex flex-col sm:flex-row gap-2"
                                >
                                    <input type="hidden" name="userId" value={user.id} />
                                    <input
                                        type="text"
                                        name="newPassword"
                                        required
                                        minLength={12}
                                        placeholder="New temporary password (12+ chars)"
                                        className="flex-1 h-10 px-4 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                    />
                                    <button
                                        type="submit"
                                        className="h-10 px-4 rounded-md bg-brand text-on-ink text-caption font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                    >
                                        Set password
                                    </button>
                                </form>
                            )}
                            {editTargetId === user.id && (
                                <form
                                    action={handleEditProfile}
                                    className="flex flex-col sm:flex-row gap-2"
                                >
                                    <input type="hidden" name="userId" value={user.id} />
                                    <input
                                        type="text"
                                        name="fullName"
                                        required
                                        defaultValue={user.full_name}
                                        placeholder="Full name"
                                        className="flex-1 h-10 px-4 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                    />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        defaultValue={user.email}
                                        placeholder="Email"
                                        className="flex-1 h-10 px-4 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                    />
                                    <button
                                        type="submit"
                                        className="h-10 px-4 rounded-md bg-brand text-on-ink text-caption font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                    >
                                        Save
                                    </button>
                                </form>
                            )}

                            {roleTargetId === user.id && (
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <select
                                        defaultValue={user.role}
                                        onChange={(e) =>
                                            handleChangeRole(user.id, e.target.value as 'admin' | 'teacher' | 'student')
                                        }
                                        disabled={isPending}
                                        className="h-10 px-4 rounded-md border border-hairline-strong bg-surface outline-none focus:border-[1.5px] focus:border-brand focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                                    >
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <p className="text-caption text-text-secondary self-center">
                                        Changing takes effect immediately and signs this person out everywhere.
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {toggleActiveError && (
                <p className="text-caption text-error mt-3" role="alert">
                    {toggleActiveError}
                </p>
            )}
            {resetError && (
                <p className="text-caption text-error mt-3" role="alert">
                    {resetError}
                </p>
            )}
            {editError && (
                <p className="text-caption text-error mt-3" role="alert">
                    {editError}
                </p>
            )}
            {roleError && (
                <p className="text-caption text-error mt-3" role="alert">
                    {roleError}
                </p>
            )}
        </div>
    )
}
