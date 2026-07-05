'use client'
// Simple form to create a new course. Same pattern as the admin create
// user page: useActionState calls the server action, shows an error if
// something goes wrong.

import { useActionState } from 'react'
import { createCourse, type CreateCourseResult } from '@/features/courses/actions/courses'

const initialState: CreateCourseResult = { ok: false, error: '' }

async function createCourseAction(_prevState: CreateCourseResult, formData: FormData) {
    return createCourse(formData)
}

export default function NewCoursePage() {
    const [state, formAction, isPending] = useActionState(createCourseAction, initialState)

    return (
        <div className="max-w-xl">
            <h1 className="text-display-xs text-ink mb-8">Create a new course</h1>

            <form action={formAction} className="bg-white rounded-hero shadow-card-lift p-8 space-y-6">
                <div>
                    <label htmlFor="title" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                        Course title
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        className="w-full h-11 px-5 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                        placeholder="e.g. Introduction to Biology"
                    />
                </div>

                <div>
                    <label htmlFor="subject" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                        Subject
                    </label>
                    <input
                        id="subject"
                        name="subject"
                        type="text"
                        className="w-full h-11 px-5 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                        placeholder="e.g. Science"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                        Description
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        rows={4}
                        className="w-full px-5 py-3 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                        placeholder="What is this course about?"
                    />
                </div>

                {!state.ok && state.error && (
                    <p className="text-caption-md text-error" role="alert">
                        {state.error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-button bg-ink text-white font-medium disabled:opacity-60"
                >
                    {isPending ? 'Creating course…' : 'Create course'}
                </button>
            </form>
        </div>
    )
}