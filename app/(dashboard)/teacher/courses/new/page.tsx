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
//
// DESIGN-LMS 2.1 REDESIGN (2026-09-06): pure visual pass, no logic
// touched — useActionState wiring and createCourse call unchanged.
// Three fixes:
//   1. `text-red` on the error message isn't a real token (only
//      `error` / `error.soft` / `error.border` exist in
//      tailwind.config.ts) — same dead-token bug class caught
//      elsewhere in this track. Fixed to `text-error`, and given a
//      `bg-error-soft` container so it reads as an alert rather than
//      plain text, matching how errors are surfaced on other forms.
//   2. Inputs used `border-[1.5px] border-hairline-strong` with no
//      focus ring — a one-off pattern that didn't match the standard
//      form-input convention used everywhere else (e.g. the public
//      InquiryForm): `border-2 border-hairline`, `focus:border-brand`,
//      `focus:ring-2 focus:ring-brand/30`. Aligned to that standard.
//      Height stays h-11 (44px) — Classroom Mode inputs are
//      deliberately not bumped to the touch-target floor, per that
//      same standing convention.
//   3. The submit button was h-12 (48px), but this is the page's one
//      PRIMARY action (Create class) — every other primary CTA in the
//      app (CoursesPreview's "Create class", admissions' "Start an
//      inquiry") sits at the 56px primary floor. Bumped to h-14.
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
                        className="h-11 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
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
                        className="h-11 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
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
                        className="w-full rounded-md border-2 border-hairline bg-surface px-4 py-3 text-body-md text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                        placeholder="e.g. MWF 10:00 AM - 11:00 AM"
                    />
                </div>

                {!state.ok && state.error && (
                    <p
                        className="rounded-md bg-error-soft px-4 py-3 text-caption font-semibold text-error"
                        role="alert"
                    >
                        {state.error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="h-14 w-full rounded-md bg-brand text-body-md font-semibold text-on-ink transition-colors hover:bg-brand-hover disabled:opacity-60"
                >
                    {isPending ? 'Creating class…' : 'Create class'}
                </button>
            </form>
        </div>
    )
}
