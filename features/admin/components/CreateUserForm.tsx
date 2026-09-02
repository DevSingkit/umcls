'use client'
// Form to create the first teacher or student accounts.
//
// DESIGN-LMS 2.1 migration: inputs h-11 -> h-13 (52px form-input floor,
// §5.1), border border-hairline-strong + focus:border-[1.5px] ->
// border-2 border-hairline (established pattern). Submit h-11 -> h-14
// (56px primary floor).
import { useActionState, useEffect, useState } from 'react'
import { createUser, type CreateUserResult } from '@/features/admin/actions/create-user'

const initialState: CreateUserResult = { ok: false, error: '' }

async function createUserAction(_prevState: CreateUserResult, formData: FormData) {
    return createUser(formData)
}

export function CreateUserForm() {
    const [state, formAction, isPending] = useActionState(createUserAction, initialState)

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState('teacher')
    const [temporaryPassword, setTemporaryPassword] = useState('')

    useEffect(() => {
        if (state.ok) {
            setFullName('')
            setEmail('')
            setRole('teacher')
            setTemporaryPassword('')
        }
    }, [state]);

    return (
        <form action={formAction} className="bg-surface rounded-md shadow-card p-8 space-y-6">
            <div>
                <label htmlFor="fullName" className="text-label text-text-secondary block mb-2">
                    Full name
                </label>
                <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-13 px-5 rounded-md border-2 border-hairline bg-surface focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    placeholder="e.g. Maria Santos"
                />
            </div>

            <div>
                <label htmlFor="email" className="text-label text-text-secondary block mb-2">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-describedby={!state.ok && state.error ? 'create-user-error' : undefined}
                    aria-invalid={!state.ok && state.error ? true : undefined}
                    className="w-full h-13 px-5 rounded-md border-2 border-hairline bg-surface focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    placeholder="name@school.edu"
                />
            </div>

            <div>
                <label htmlFor="role" className="text-label text-text-secondary block mb-2">
                    Role
                </label>
                <select
                    id="role"
                    name="role"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-13 px-5 rounded-md border-2 border-hairline bg-surface focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                </select>
            </div>

            <div>
                <label htmlFor="temporaryPassword" className="text-label text-text-secondary block mb-2">
                    Temporary password
                </label>
                <input
                    id="temporaryPassword"
                    name="temporaryPassword"
                    type="text"
                    required
                    minLength={12}
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    className="w-full h-13 px-5 rounded-md border-2 border-hairline bg-surface focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    placeholder="At least 12 characters, with upper, lower, and a number"
                />
                <p className="text-caption text-text-secondary mt-2">
                    Share this with the new user directly. They can change it after logging in.
                </p>
            </div>

            {!state.ok && state.error && (
                <p id="create-user-error" className="text-caption text-error" role="alert">
                    {state.error}
                </p>
            )}

            {state.ok && (
                <p className="text-caption text-success" role="status">
                    Account created. The person can now log in with the email and temporary password above.
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full h-14 rounded-md bg-brand text-on-ink font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
            >
                {isPending ? 'Creating account…' : 'Create account'}
            </button>
        </form>
    )
}
