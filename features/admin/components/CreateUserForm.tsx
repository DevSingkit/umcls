'use client'
// Form to create the first teacher or student accounts (PH2-002).
// Extracted from admin/users/page.tsx so that page can become a server
// component and load the user list alongside this form. See
// features/admin/actions/create-user.ts for what happens on submit.

import { useActionState } from 'react'
import { createUser, type CreateUserResult } from '@/features/admin/actions/create-user'

const initialState: CreateUserResult = { ok: false, error: '' }

// useActionState needs a (prevState, formData) function, but createUser
// only takes formData. This small wrapper adapts one to the other, same
// pattern used in app/(auth)/login/page.tsx.
async function createUserAction(_prevState: CreateUserResult, formData: FormData) {
    return createUser(formData)
}

export function CreateUserForm() {
    const [state, formAction, isPending] = useActionState(createUserAction, initialState)

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
                    className="w-full h-11 px-5 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
                    className="w-full h-11 px-5 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
                    className="w-full h-11 px-5 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    defaultValue="teacher"
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
                    className="w-full h-11 px-5 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    placeholder="At least 12 characters, with upper, lower, and a number"
                />
                <p className="text-caption text-text-secondary mt-2">
                    Share this with the new user directly. They can change it after logging in.
                </p>
            </div>

            {!state.ok && state.error && (
                <p className="text-caption text-error" role="alert">
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
                className="w-full h-11 rounded-md bg-brand text-on-ink font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
            >
                {isPending ? 'Creating account…' : 'Create account'}
            </button>
        </form>
    )
}
