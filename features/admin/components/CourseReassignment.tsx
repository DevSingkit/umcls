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
    courses: { id: string; title: string; subject: string | null }[]
    teachers: { id: string; full_name: string; email: string }[]
}) {
    const [state, formAction, isPending] = useActionState(assignAction, initialState)

    return (
        <form action={formAction} className="bg-surface rounded-md shadow-card p-8 space-y-6">
            <div>
                <label htmlFor="courseId" className="text-label text-text-secondary block mb-2">
                    Course
                </label>
                <select
                    id="courseId"
                    name="courseId"
                    required
                    className="w-full h-11 px-5 rounded-md border border-hairline-strong bg-surface outline-none focus:border-[1.5px] focus:border-brand focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <option value="">Choose a course</option>
                    {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                            {course.title}
                            {course.subject ? ` — ${course.subject}` : ''}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="teacherId" className="text-label text-text-secondary block mb-2">
                    Assign to teacher
                </label>
                <select
                    id="teacherId"
                    name="teacherId"
                    required
                    className="w-full h-11 px-5 rounded-md border border-hairline-strong bg-surface outline-none focus:border-[1.5px] focus:border-brand focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <option value="">Choose a teacher</option>
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
                <p className="text-caption text-success" role="status">
                    Course reassigned.
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 rounded-md bg-brand text-on-ink font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
            >
                {isPending ? 'Reassigning…' : 'Reassign course'}
            </button>
        </form>
    )
}
