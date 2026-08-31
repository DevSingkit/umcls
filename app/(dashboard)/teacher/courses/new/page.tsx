'use client'
// Simple form to create a new course. Same pattern as the admin create
// user page: useActionState calls the server action, shows an error if
// something goes wrong.
//
// GRADE_LEVEL FIELD REMOVED (2026-08-30, continued conversation,
// migration 092): confirmed fully unused beyond its original,
// now-retired purpose (AI Simplify targeting) — checked CourseCard.tsx
// and AdminCourseList.tsx, neither references it. User confirmed
// removing the column AND this field, not just backend cleanup.

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
            <h1 className="mb-8 text-h1 text-ink">Create a new class</h1>

            <form action={formAction} className="space-y-6 rounded-md bg-surface p-8 shadow-card">
                <div>
                    <label htmlFor="title" className="mb-2 block text-label text-ink-soft">
                        Grade and Section
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        className="h-11 w-full rounded-md border-[1.5px] border-hairline-strong px-4 text-body-md outline-none focus:border-brand"
                        placeholder="e.g. Grade 1 - Matthew"
                    />
                </div>

                <div>
                    <label htmlFor="subject" className="mb-2 block text-label text-ink-soft">
                        Subject
                    </label>
                    <input
                        id="subject"
                        name="subject"
                        type="text"
                        className="h-11 w-full rounded-md border-[1.5px] border-hairline-strong px-4 text-body-md outline-none focus:border-brand"
                        placeholder="e.g. English"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="mb-2 block text-label text-ink-soft">
                        Description or Schedule
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        rows={4}
                        className="w-full rounded-md border-[1.5px] border-hairline-strong px-4 py-3 text-body-md outline-none focus:border-brand"
                        placeholder="e.g. MWF 10:00 AM - 11:00 AM"
                    />
                </div>

                {!state.ok && state.error && (
                    <p className="text-caption text-red" role="alert">
                        {state.error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="h-12 w-full rounded-md bg-brand text-body-md font-semibold text-on-ink hover:bg-brand-hover disabled:opacity-60"
                >
                    {isPending ? 'Creating class…' : 'Create class'}
                </button>
            </form>
        </div>
    )
}
