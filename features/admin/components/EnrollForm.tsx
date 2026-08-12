'use client'
// Form with two dropdowns, one student and one course. Submitting it
// enrolls that student into that course.
//
// No longer wraps itself in max-w-2xl — this form now lives inside
// admin/users/page.tsx's own max-w-3xl container alongside
// CourseReassignment and the user list, so it should fill that
// container's width like its siblings do, not impose its own
// narrower width and look small next to them.

import { useActionState } from 'react'
import { enrollStudent, type EnrollResult } from '@/features/admin/actions/enroll-student'

const initialState: EnrollResult = { ok: false, error: '' }

async function enrollAction(_prevState: EnrollResult, formData: FormData) {
    return enrollStudent(formData)
}

export function EnrollForm({
    students,
    courses,
}: {
    students: { id: string; full_name: string; email: string }[]
    courses: { id: string; title: string; subject: string | null }[]
}) {
    const [state, formAction, isPending] = useActionState(enrollAction, initialState)

    return (
        <form action={formAction} className="bg-surface rounded-md shadow-card p-8 space-y-6">
            <div>
                <label htmlFor="studentId" className="text-label text-text-secondary block mb-2">
                    Student
                </label>
                <select
                    id="studentId"
                    name="studentId"
                    required
                    className="w-full h-11 px-5 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <option value="">Choose a student</option>
                    {students.map((student) => (
                        <option key={student.id} value={student.id}>
                            {student.full_name} ({student.email})
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="courseId" className="text-label text-text-secondary block mb-2">
                    Classes
                </label>
                <select
                    id="courseId"
                    name="courseId"
                    required
                    className="w-full h-11 px-5 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <option value="">Choose a class</option>
                    {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                            {course.title}
                            {course.subject ? ` — ${course.subject}` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {!state.ok && state.error && (
                <p className="text-caption text-error" role="alert">
                    {state.error}
                </p>
            )}

            {state.ok && (
                <p className="text-caption text-success" role="status">
                    Student enrolled successfully.
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 rounded-md bg-brand text-on-ink font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
            >
                {isPending ? 'Enrolling…' : 'Enroll student'}
            </button>
        </form>
    )
}
