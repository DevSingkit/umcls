'use client'
// Searchable/filterable user list with deactivate, reactivate, and
// password-reset actions.
//
// All state-consolidation logic (single openPanel slot, deactivate/
// erase confirm modals) is unchanged from prior sessions.
//
// DESIGN-LMS 2.1 migration (this pass): dead red/bg-red/border-red/
// bg-red-soft tokens (7 instances) replaced with error/bg-error/
// border-error/bg-error-soft. border-[1.5px] -> border-2 (established
// pairing with border-hairline-strong). font-heading removed from the
// deactivate-confirm modal heading (Classroom Mode heading, defaults
// to font-sans via globals.css's base layer, no class needed). Inline
// action buttons (Set password/Save/role select/unenroll) bumped from
// h-10/h-8 to h-12 (48px secondary floor). Menu trigger kept at its
// visible 36px (h-9) per the dense-row-action exception, with its tap
// boundary extended to 44px via the invisible-hitbox technique.
// Deactivate/Erase modal buttons bumped h-10 -> h-12. Destructive
// action modal stays inlined here (not extracted to match
// EraseUserModal's pattern) — deliberate, confirmed with user.
//
// DESIGN-LMS 2.1 bugfix pass: the three filter controls (search, role,
// status) were still on the old h-11/border-hairline-strong pattern —
// h-11 (44px) sits below the 48px secondary-row floor, and
// border-hairline-strong + focus:border-2 doesn't match every other
// input in the app (border-2 border-hairline focus:border-brand, see
// CreateUserForm/SearchableSelect/AuditLogViewer). Both fixed here.
// Deactivate-confirm modal's Cancel button also switched from
// border-hairline-strong to border-hairline to match AdminCourseList's
// confirm-modal pattern, the same dialog shape used elsewhere.
import { useEffect, useState, useTransition, useCallback, useRef } from 'react'
import { MoreVertical, AlertTriangle } from 'lucide-react'
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
import {
    getStudentEnrollments,
    unenrollStudent,
    type StudentEnrollment,
} from '@/features/admin/actions/enroll-student'
import { EraseUserModal } from '@/features/admin/components/EraseUserModal'

export function UserList({ initialUsers }: { initialUsers: UserRow[] }) {
    const [users, setUsers] = useState(initialUsers)
    const [search, setSearch] = useState('')
    const [role, setRole] = useState<'all' | 'admin' | 'teacher' | 'student'>('all')
    const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
    const [isPending, startTransition] = useTransition()

    type OpenPanel = { type: 'reset' | 'edit' | 'role' | 'enroll'; userId: string } | null
    const [openPanel, setOpenPanel] = useState<OpenPanel>(null)

    const resetTargetId = openPanel?.type === 'reset' ? openPanel.userId : null
    const editTargetId = openPanel?.type === 'edit' ? openPanel.userId : null
    const roleTargetId = openPanel?.type === 'role' ? openPanel.userId : null
    const enrollTargetId = openPanel?.type === 'enroll' ? openPanel.userId : null

    function togglePanel(type: NonNullable<OpenPanel>['type'], userId: string) {
        setOpenPanel((prev) => (prev?.type === type && prev.userId === userId ? null : { type, userId }))
    }

    const [resetError, setResetError] = useState<string | null>(null)
    const [editError, setEditError] = useState<string | null>(null)
    const [roleError, setRoleError] = useState<string | null>(null)
    const [roleCheckPending, setRoleCheckPending] = useState(false)
    const [toggleActiveError, setToggleActiveError] = useState<string | null>(null)
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([])
    const [enrollLoading, setEnrollLoading] = useState(false)
    const [enrollError, setEnrollError] = useState<string | null>(null)
    const [unenrollPendingId, setUnenrollPendingId] = useState<string | null>(null)

    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const [deactivateConfirmUser, setDeactivateConfirmUser] = useState<UserRow | null>(null)
    const [eraseConfirmUser, setEraseConfirmUser] = useState<UserRow | null>(null)

    const refresh = useCallback(() => {
        startTransition(async () => {
            const result = await listUsers({ search, role, status })
            setUsers(result)
        })
    }, [search, role, status])

    useEffect(() => {
        const timer = setTimeout(refresh, 300)
        return () => clearTimeout(timer)
    }, [refresh])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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

    function confirmDeactivate() {
        if (!deactivateConfirmUser) return
        handleDeactivate(deactivateConfirmUser.id)
        setDeactivateConfirmUser(null)
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
            setOpenPanel(null)
        } else {
            setResetError(result.error)
        }
    }

    async function handleEditProfile(formData: FormData) {
        setEditError(null)
        const result = await updateUserProfile(formData)
        if (result.ok) {
            setOpenPanel(null)
            refresh()
        } else {
            setEditError(result.error)
        }
    }

    async function handleOpenRoleChange(userId: string) {
        setRoleError(null)
        if (roleTargetId === userId) {
            setOpenPanel(null)
            return
        }
        setRoleCheckPending(true)
        const eligibility = await getUserRoleChangeEligibility(userId)
        setRoleCheckPending(false)
        if (!eligibility.eligible) {
            setRoleError(eligibility.reason)
            return
        }
        setOpenPanel({ type: 'role', userId })
    }

    function handleChangeRole(userId: string, newRole: 'admin' | 'teacher' | 'student') {
        setRoleError(null)
        startTransition(async () => {
            const result = await changeUserRole(userId, newRole)
            if (result.ok) {
                setOpenPanel(null)
                refresh()
            } else {
                setRoleError(result.error)
            }
        })
    }

    async function handleOpenEnrollments(userId: string) {
        setEnrollError(null)
        if (enrollTargetId === userId) {
            setOpenPanel(null)
            return
        }
        setOpenPanel({ type: 'enroll', userId })
        setEnrollLoading(true)
        const result = await getStudentEnrollments(userId)
        setEnrollments(result)
        setEnrollLoading(false)
    }

    function handleUnenroll(enrollmentId: string) {
        setEnrollError(null)
        setUnenrollPendingId(enrollmentId)
        startTransition(async () => {
            const result = await unenrollStudent(enrollmentId)
            setUnenrollPendingId(null)
            if (result.ok) {
                setEnrollments((prev) => prev.filter((e) => e.enrollmentId !== enrollmentId))
            } else {
                setEnrollError(result.error)
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
                    className="flex-1 h-12 px-5 rounded-md border-2 border-hairline bg-surface focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as typeof role)}
                    className="h-12 px-4 rounded-md border-2 border-hairline bg-surface outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <option value="all">All roles</option>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                </select>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="h-12 px-4 rounded-md border-2 border-hairline bg-surface outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand"
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
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div>
                                        <p className="text-body-emphasis text-ink">{user.full_name}</p>
                                        <p className="text-caption text-text-secondary">
                                            {user.email} · {user.role}
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-caption font-semibold ${
                                            user.is_active
                                                ? 'bg-brand-soft text-brand'
                                                : 'bg-error-soft text-error'
                                        }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-pill ${
                                                user.is_active ? 'bg-brand' : 'bg-error'
                                            }`}
                                            aria-hidden="true"
                                        />
                                        {user.is_active ? 'Active' : 'Deactivated'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Dense-row-action exception: 36px visible (h-9), tap
                                        boundary extended to 44px via invisible hitbox. */}
                                    <div className="relative" ref={openMenuId === user.id ? menuRef : undefined}>
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                            aria-haspopup="menu"
                                            aria-expanded={openMenuId === user.id}
                                            aria-label={`Actions for ${user.full_name}`}
                                            className={`relative flex h-9 w-9 items-center justify-center rounded-md border-2 before:absolute before:-inset-2 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                                openMenuId === user.id
                                                    ? 'border-brand bg-brand-soft'
                                                    : 'border-hairline-strong bg-surface hover:bg-surface-sunken'
                                            }`}
                                        >
                                            <MoreVertical className="h-4 w-4 text-ink" strokeWidth={2} aria-hidden="true" />
                                        </button>

                                        {openMenuId === user.id && (
                                            <div
                                                role="menu"
                                                className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-md border border-hairline-strong bg-surface shadow-card-hover"
                                            >
                                                <button
                                                    role="menuitem"
                                                    onClick={() => {
                                                        togglePanel('edit', user.id)
                                                        setEditError(null)
                                                        setOpenMenuId(null)
                                                    }}
                                                    className="block w-full px-4 py-2.5 text-left text-caption text-ink hover:bg-surface-sunken"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    role="menuitem"
                                                    disabled={roleCheckPending}
                                                    onClick={async () => {
                                                        setOpenMenuId(null)
                                                        await handleOpenRoleChange(user.id)
                                                    }}
                                                    className="block w-full px-4 py-2.5 text-left text-caption text-ink hover:bg-surface-sunken disabled:opacity-60"
                                                >
                                                    {roleCheckPending ? 'Checking…' : 'Change role'}
                                                </button>
                                                {user.role === 'student' && (
                                                    <button
                                                        role="menuitem"
                                                        onClick={async () => {
                                                            setOpenMenuId(null)
                                                            await handleOpenEnrollments(user.id)
                                                        }}
                                                        className="block w-full px-4 py-2.5 text-left text-caption text-ink hover:bg-surface-sunken"
                                                    >
                                                        Classes
                                                    </button>
                                                )}
                                                <button
                                                    role="menuitem"
                                                    onClick={() => {
                                                        togglePanel('reset', user.id)
                                                        setOpenMenuId(null)
                                                    }}
                                                    className="block w-full px-4 py-2.5 text-left text-caption text-ink hover:bg-surface-sunken"
                                                >
                                                    Reset password
                                                </button>
                                                <div className="border-t border-hairline" />
                                                {user.is_active ? (
                                                    <button
                                                        role="menuitem"
                                                        disabled={isPending}
                                                        onClick={() => {
                                                            setOpenMenuId(null)
                                                            setDeactivateConfirmUser(user)
                                                        }}
                                                        className="block w-full px-4 py-2.5 text-left text-caption font-medium text-error hover:bg-error-soft disabled:opacity-60"
                                                    >
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <button
                                                        role="menuitem"
                                                        disabled={isPending}
                                                        onClick={() => {
                                                            setOpenMenuId(null)
                                                            handleReactivate(user.id)
                                                        }}
                                                        className="block w-full px-4 py-2.5 text-left text-caption font-medium text-brand hover:bg-brand-soft disabled:opacity-60"
                                                    >
                                                        Reactivate
                                                    </button>
                                                )}
                                                <button
                                                    role="menuitem"
                                                    onClick={() => {
                                                        setOpenMenuId(null)
                                                        setEraseConfirmUser(user)
                                                    }}
                                                    className="block w-full px-4 py-2.5 text-left text-caption font-medium text-error hover:bg-error-soft"
                                                >
                                                    Erase User Data
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {resetTargetId === user.id && (
                                <form action={handleResetPassword} className="flex flex-col sm:flex-row gap-2">
                                    <input type="hidden" name="userId" value={user.id} />
                                    <input
                                        type="text"
                                        name="newPassword"
                                        required
                                        minLength={12}
                                        placeholder="New temporary password (12+ chars)"
                                        className="flex-1 h-12 px-4 rounded-md border border-hairline-strong bg-surface focus:border-2 focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                    />
                                    <button
                                        type="submit"
                                        className="h-12 px-4 rounded-md bg-brand text-on-ink text-caption font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                    >
                                        Set password
                                    </button>
                                </form>
                            )}
                            {editTargetId === user.id && (
                                <form action={handleEditProfile} className="flex flex-col sm:flex-row gap-2">
                                    <input type="hidden" name="userId" value={user.id} />
                                    <input
                                        type="text"
                                        name="fullName"
                                        required
                                        defaultValue={user.full_name}
                                        placeholder="Full name"
                                        className="flex-1 h-12 px-4 rounded-md border border-hairline-strong bg-surface focus:border-2 focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                    />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        defaultValue={user.email}
                                        placeholder="Email"
                                        className="flex-1 h-12 px-4 rounded-md border border-hairline-strong bg-surface focus:border-2 focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                    />
                                    <button
                                        type="submit"
                                        className="h-12 px-4 rounded-md bg-brand text-on-ink text-caption font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
                                        className="h-12 px-4 rounded-md border border-hairline-strong bg-surface outline-none focus:border-2 focus:border-brand focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
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

                            {enrollTargetId === user.id && (
                                <div className="rounded-md border border-hairline-strong p-4">
                                    {enrollLoading ? (
                                        <p className="text-caption text-text-secondary">Loading classes…</p>
                                    ) : enrollments.length === 0 ? (
                                        <p className="text-caption text-text-secondary">
                                            Not currently enrolled in any class.
                                        </p>
                                    ) : (
                                        <ul className="flex flex-col gap-2">
                                            {enrollments.map((e) => (
                                                <li key={e.enrollmentId} className="flex items-center justify-between gap-3">
                                                    <span className="text-caption text-ink">
                                                        {e.title}
                                                        {e.subject ? ` — ${e.subject}` : ''}
                                                    </span>
                                                    <button
                                                        onClick={() => handleUnenroll(e.enrollmentId)}
                                                        disabled={unenrollPendingId === e.enrollmentId}
                                                        className="h-12 px-3 rounded-md border-2 border-error bg-surface text-error text-caption font-medium hover:bg-error-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 shrink-0"
                                                    >
                                                        {unenrollPendingId === e.enrollmentId ? 'Unenrolling…' : 'Unenroll'}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {toggleActiveError && (
                <p className="text-caption text-error mt-3" role="alert">{toggleActiveError}</p>
            )}
            {resetError && (
                <p className="text-caption text-error mt-3" role="alert">{resetError}</p>
            )}
            {editError && (
                <p className="text-caption text-error mt-3" role="alert">{editError}</p>
            )}
            {roleError && (
                <p className="text-caption text-error mt-3" role="alert">{roleError}</p>
            )}
            {enrollError && (
                <p className="text-caption text-error mt-3" role="alert">{enrollError}</p>
            )}

            {deactivateConfirmUser && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="deactivate-confirm-title"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
                    onClick={() => setDeactivateConfirmUser(null)}
                >
                    <div className="w-full max-w-sm rounded-md bg-surface p-6 shadow-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-error-soft">
                                <AlertTriangle className="h-5 w-5 text-error" strokeWidth={2} aria-hidden="true" />
                            </div>
                            <div>
                                <h2 id="deactivate-confirm-title" className="text-body-emphasis text-ink">
                                    Deactivate this account?
                                </h2>
                                <p className="mt-2 text-caption text-text-secondary">
                                    <span className="font-medium text-ink">{deactivateConfirmUser.full_name}</span>{' '}
                                    ({deactivateConfirmUser.email}) will immediately lose access and won&apos;t be
                                    able to sign in until this account is reactivated.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setDeactivateConfirmUser(null)}
                                className="h-12 px-4 rounded-md border-2 border-hairline bg-surface text-ink text-caption font-medium hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeactivate}
                                disabled={isPending}
                                className="h-12 px-4 rounded-md bg-error text-on-ink text-caption font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                            >
                                {isPending ? 'Deactivating…' : 'Deactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {eraseConfirmUser && (
                <EraseUserModal
                    userId={eraseConfirmUser.id}
                    fullName={eraseConfirmUser.full_name}
                    isOpen={true}
                    onClose={() => setEraseConfirmUser(null)}
                    onErased={() => {
                        setEraseConfirmUser(null)
                        refresh()
                    }}
                />
            )}
        </div>
    )
}
