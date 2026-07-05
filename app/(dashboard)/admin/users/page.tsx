'use client'

// Admin screen to create the first teacher or student accounts (PH2-002,
// trimmed for V1). No CSV import, no polished user list yet, just a form
// that works. See features/admin/actions/create-user.ts for what happens
// when this is submitted.

import { useActionState } from 'react'
import { createUser, type CreateUserResult } from '@/features/admin/actions/create-user'

const initialState: CreateUserResult = { ok: false, error: '' }

// useActionState needs a (prevState, formData) function, but createUser
// only takes formData. This small wrapper adapts one to the other, same
// pattern used in app/(auth)/login/page.tsx.
async function createUserAction(_prevState: CreateUserResult, formData: FormData) {
    return createUser(formData)
}

export default function AdminUsersPage() {
    const [state, formAction, isPending] = useActionState(createUserAction, initialState)

    return (
        <div className="min-h-screen bg-canvas px-md py-xxl">
            <div className="mx-auto max-w-xl">
                <p className="text-label-md uppercase tracking-wide text-graphite">
                    • ADMIN
                </p>
                <h1 className="text-display-xs text-ink mt-2 mb-8">
                    Create a new account
                </h1>

                <form action={formAction} className="bg-white rounded-hero shadow-card-lift p-8 space-y-6">
                    <div>
                        <label htmlFor="fullName" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                            Full name
                        </label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            required
                            className="w-full h-11 px-5 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                            placeholder="e.g. Maria Santos"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="w-full h-11 px-5 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                            placeholder="name@school.edu"
                        />
                    </div>

                    <div>
                        <label htmlFor="role" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                            Role
                        </label>
                        <select
                            id="role"
                            name="role"
                            required
                            className="w-full h-11 px-5 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                            defaultValue="teacher"
                        >
                            <option value="teacher">Teacher</option>
                            <option value="student">Student</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="temporaryPassword" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                            Temporary password
                        </label>
                        <input
                            id="temporaryPassword"
                            name="temporaryPassword"
                            type="text"
                            required
                            minLength={12}
                            className="w-full h-11 px-5 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                            placeholder="At least 12 characters, with upper, lower, and a number"
                        />
                        <p className="text-caption-md text-graphite mt-2">
                            Share this with the new user directly. They can change it after logging in.
                        </p>
                    </div>

                    {!state.ok && state.error && (
                        <p className="text-caption-md text-signal" role="alert">
                            {state.error}
                        </p>
                    )}

                    {state.ok && (
                        <p className="text-caption-md text-ink" role="status">
                            Account created. The person can now log in with the email and temporary password above.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full h-11 rounded-button bg-ink text-white font-medium disabled:opacity-60"
                    >
                        {isPending ? 'Creating account…' : 'Create account'}
                    </button>
                </form>
            </div>
        </div>
    )
}