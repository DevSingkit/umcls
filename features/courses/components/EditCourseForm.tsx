'use client'
// Edits an existing course's title/description/subject. Mirrors the
// create-course form fields but calls updateCourse instead.
import { useState, useTransition } from 'react'
import { updateCourse } from '@/features/courses/actions/courses'
import { ClassmatesVisibilityToggle } from '@/features/courses/components/ClassmatesVisibilityToggle'

export function EditCourseForm({
    courseId,
    initialTitle,
    initialDescription,
    initialSubject,
    initialShowClassmates,
}: {
    courseId: string
    initialTitle: string
    initialDescription: string | null
    initialSubject: string | null
    initialShowClassmates: boolean
}) {
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleSubmit(formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await updateCourse(courseId, formData)
            if (result && !result.ok) {
                setError(result.error)
            }
            // On success, updateCourse redirects server-side.
        })
    }

    return (
        // max-w-2xl is the shared single-form-card width, DESIGN-LMS.md §7.8.
        <form action={handleSubmit} className="grid max-w-2xl gap-5">
            {error && <p className="text-caption text-error">{error}</p>}
            <div>
                <label htmlFor="title" className="mb-2 block text-label text-ink-soft">Title</label>
                <input
                    id="title"
                    name="title"
                    defaultValue={initialTitle}
                    className="h-11 w-full rounded-md border-[1.5px] border-hairline-strong px-4 text-body-md outline-none focus:border-brand"
                    required
                />
            </div>
            <div>
                <label htmlFor="subject" className="mb-2 block text-label text-ink-soft">Subject</label>
                <input
                    id="subject"
                    name="subject"
                    defaultValue={initialSubject ?? ''}
                    className="h-11 w-full rounded-md border-[1.5px] border-hairline-strong px-4 text-body-md outline-none focus:border-brand"
                />
            </div>
            <div>
                <label htmlFor="description" className="mb-2 block text-label text-ink-soft">Description</label>
                <textarea
                    id="description"
                    name="description"
                    defaultValue={initialDescription ?? ''}
                    rows={4}
                    className="w-full rounded-md border-[1.5px] border-hairline-strong px-4 py-3 text-body-md outline-none focus:border-brand"
                />
            </div>
            <ClassmatesVisibilityToggle courseId={courseId} initialShowClassmates={initialShowClassmates} />

            <button
                type="submit"
                disabled={isPending}
                className="h-11 justify-self-start rounded-md bg-brand px-6 text-body-md font-semibold text-on-ink hover:bg-brand-hover disabled:opacity-60"
            >
                {isPending ? 'Saving…' : 'Save changes'}
            </button>
        </form>
    )
}
