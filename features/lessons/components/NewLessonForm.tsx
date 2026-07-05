'use client'
// The actual lesson creation form. Split into its own client component
// because the page above needs to read the courseId on the server
// first, and a single file cannot be both a server component and a
// client component at once.

import { useActionState } from 'react'
import { createLesson, type CreateLessonResult } from '@/features/lessons/actions/lessons'

const initialState: CreateLessonResult = { ok: false, error: '' }

async function createLessonAction(_prevState: CreateLessonResult, formData: FormData) {
    return createLesson(formData)
}

export function NewLessonForm({ courseId }: { courseId: string }) {
    const [state, formAction, isPending] = useActionState(createLessonAction, initialState)

    return (
        <div className="max-w-xl">
            <h1 className="text-display-xs text-ink mb-8">Create a new lesson</h1>

            <form action={formAction} className="bg-white rounded-hero shadow-card-lift p-8 space-y-6">
                <input type="hidden" name="courseId" value={courseId} />

                <div>
                    <label htmlFor="title" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                        Lesson title
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        className="w-full h-11 px-5 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                        placeholder="e.g. Cell structure"
                    />
                </div>

                <div>
                    <label htmlFor="content" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                        Lesson content
                    </label>
                    <textarea
                        id="content"
                        name="content"
                        rows={10}
                        required
                        className="w-full px-5 py-3 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                        placeholder="Write the lesson here"
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
                    {isPending ? 'Creating lesson…' : 'Create lesson'}
                </button>
            </form>
        </div>
    )
}