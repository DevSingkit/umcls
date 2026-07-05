'use client'
// Form with two dropdowns, one student and one course. Submitting it
// enrolls that student into that course.

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
    courses: { id: string; title: string }[]
}) {
    const [state, formAction, isPending] = useActionState(enrollAction, initialState)

    return (
        <div className="max-w-xl">
            <h1 className="text-display-xs text-ink mb-8">Enroll a student</h1>

            <form action={formAction} className="bg-white rounded-hero shadow-card-lift p-8 space-y-6">
                <div>
                    <label htmlFor="studentId" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                        Student
                    </label>
                    <select
                        id="studentId"
                        name="studentId"
                        required
                        className="w-full h-11 px-5 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
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
                    <label htmlFor="courseId" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                        Course
                    </label>
                    <select
                        id="courseId"
                        name="courseId"
                        required
                        className="w-full h-11 px-5 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                    >
                        <option value="">Choose a course</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                </div>

                {!state.ok && state.error && (
                    <p className="text-caption-md text-error" role="alert">
                        {state.error}
                    </p>
                )}

                {state.ok && (
                    <p className="text-caption-md text-success" role="status">
                        Student enrolled successfully.
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-button bg-ink text-white font-medium disabled:opacity-60"
                >
                    {isPending ? 'Enrolling…' : 'Enroll student'}
                </button>
            </form>
        </div>
    )
}