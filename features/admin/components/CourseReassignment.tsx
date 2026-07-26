'use client'
// Lets an admin reassign which teacher owns a course (FR-ADMIN-10 /
// US-010). Simple two-dropdown form, no styling beyond the existing
// admin form pattern.
import { useActionState } from 'react'
import { assignCourseTeacher, type AssignTeacherResult } from '@/features/admin/actions/users'

const initialState: AssignTeacherResult = { ok: false, error: '' }

async function assignAction(_prevState: AssignTeacherResult, formData: FormData) {
    return assignCourseTeacher(formData)
}

export function CourseReassignment({
    courses,
    teachers,
}: {
    courses: { id: string; title: string }[]
    teachers: { id: string; full_name: string; email: string }[]
}) {
    const [state, formAction, isPending] = useActionState(assignAction, initialState)

    return (
        <form action={formAction} className="bg-surface rounded-md shadow-card p-8 space-y-6">
            <div>
                <label htmlFor="courseId" className="text-label uppercase tracking-wide text-text-secondary block mb-2">
                    Course
                </label>
                <select
                    id="courseId"
                    name="courseId"
                    required
                    className="w-full h-11 px-5 rounded-md border border-hairline outline-none"
                >
                    {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                            {course.title}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="teacherId" className="text-label uppercase tracking-wide text-text-secondary block mb-2">
                    Assign to teacher
                </label>
                <select
                    id="teacherId"
                    name="teacherId"
                    required
                    className="w-full h-11 px-5 rounded-md border border-hairline outline-none"
                >
                    {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                            {teacher.full_name} ({teacher.email})
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
                <p className="text-caption text-ink" role="status">
                    Course reassigned.
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 rounded-md bg-ink text-on-ink font-medium disabled:opacity-60"
            >
                {isPending ? 'Reassigning…' : 'Reassign course'}
            </button>
        </form>
    )
}