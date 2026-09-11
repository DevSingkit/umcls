'use client'
// Lets an admin reassign which teacher owns a course.
//
// DESIGN-LMS 2.1 migration: submit h-11 -> h-14 (56px primary floor).
// SearchableSelect handles its own migration.

import { useActionState } from 'react'
import { assignCourseTeacher, type AssignTeacherResult } from '@/features/admin/actions/users'
import { SearchableSelect } from './SearchableSelect'

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
                <label htmlFor="courseId-search" className="text-label text-text-secondary block mb-2">
                    Class
                </label>
                <SearchableSelect
                    name="courseId"
                    required
                    placeholder="Search for a class…"
                    options={courses.map((course) => ({
                        id: course.id,
                        label: course.title,
                        sublabel: course.subject ?? undefined,
                    }))}
                />
            </div>

            <div>
                <label htmlFor="teacherId-search" className="text-label text-text-secondary block mb-2">
                    Assign to teacher
                </label>
                <SearchableSelect
                    name="teacherId"
                    required
                    placeholder="Search for a teacher…"
                    options={teachers.map((teacher) => ({
                        id: teacher.id,
                        label: teacher.full_name,
                        sublabel: teacher.email,
                    }))}
                />
            </div>

            {!state.ok && state.error && (
                <p className="text-caption text-error" role="alert">
                    {state.error}
                </p>
            )}
            {state.ok && (
                <p className="text-caption text-success" role="status">
                    Class reassigned.
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full h-14 rounded-md bg-brand text-on-ink font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
            >
                {isPending ? 'Reassigning…' : 'Reassign Class'}
            </button>
        </form>
    )
}
