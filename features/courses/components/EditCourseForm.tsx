'use client'
// Edits an existing course's title/description/subject. Mirrors the
// create-course form fields but calls updateCourse instead.
//
// GRADE_LEVEL FIELD REMOVED (2026-08-30, continued conversation,
// migration 092): confirmed fully unused beyond its original,
// now-retired purpose (AI Simplify targeting) — checked CourseCard.tsx
// and AdminCourseList.tsx, neither references it. User confirmed
// removing the column AND this field, not just backend cleanup.
//
// DESIGN-LMS 2.1 pass (2026-09-06): "Save changes" bumped from h-11 to
// h-14 — this is the form's one primary action, matching the app-wide
// h-14 primary-CTA standard applied across this cluster (NewCoursePage
// "Create class", AnnouncementComposer trigger, EnrollStudentForm
// "Enroll student").
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
                    className="h-11 w-full rounded-md border-2 border-hairline px-4 text-body-md outline-none focus:border-brand"
                    required
                />
            </div>
            <div>
                <label htmlFor="subject" className="mb-2 block text-label text-ink-soft">Subject</label>
                <input
                    id="subject"
                    name="subject"
                    defaultValue={initialSubject ?? ''}
                    className="h-11 w-full rounded-md border-2 border-hairline px-4 text-body-md outline-none focus:border-brand"
                />
            </div>
            <div>
                <label htmlFor="description" className="mb-2 block text-label text-ink-soft">Description</label>
                <textarea
                    id="description"
                    name="description"
                    defaultValue={initialDescription ?? ''}
                    rows={4}
                    className="w-full rounded-md border-2 border-hairline px-4 py-3 text-body-md outline-none focus:border-brand"
                />
            </div>
            <ClassmatesVisibilityToggle courseId={courseId} initialShowClassmates={initialShowClassmates} />

            <button
                type="submit"
                disabled={isPending}
                className="h-14 justify-self-start rounded-md bg-brand px-6 text-body-md font-semibold text-on-ink hover:bg-brand-hover disabled:opacity-60"
            >
                {isPending ? 'Saving…' : 'Save changes'}
            </button>
        </form>
    )
}
