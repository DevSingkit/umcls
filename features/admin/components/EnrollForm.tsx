'use client'
// Form to enroll one student into one course.
//
// No max-w wrapper of its own — fills whatever container the page
// puts it in. The enroll page now applies max-w-2xl directly (§7.8
// single-form content), so this form's card fills that width exactly.

import { useActionState } from 'react'
import { enrollStudent, type EnrollResult } from '@/features/admin/actions/enroll-student'
import { SearchableSelect } from './SearchableSelect'

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
                <label htmlFor="studentId-search" className="text-label text-text-secondary block mb-2">
                    Student
                </label>
                <SearchableSelect
                    name="studentId"
                    required
                    placeholder="Search for a student…"
                    options={students.map((student) => ({
                        id: student.id,
                        label: student.full_name,
                        sublabel: student.email,
                    }))}
                />
            </div>

            <div>
                <label htmlFor="courseId-search" className="text-label text-text-secondary block mb-2">
                    Classes
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