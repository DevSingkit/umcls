'use client'
// Form to enroll one student into one course.
//
// DESIGN-LMS 2.1 migration: submit h-11 -> h-14 (56px primary floor).
// SearchableSelect handles its own migration.

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    enrollStudent,
    getStudentEnrollments,
    type EnrollResult,
} from '@/features/admin/actions/enroll-student'
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

    // After a successful enroll, both SearchableSelects need to go back
    // to their default ("Search for a…") state — otherwise the just-
    // enrolled student/course stays shown, and worse, the dropdown's own
    // internal filtered list stays stuck on whatever text was last typed,
    // so other names don't show up until a manual page refresh.
    //
    // Rather than reaching into SearchableSelect's internals (which this
    // component doesn't own), bumping `resetKey` and using it as each
    // SearchableSelect's `key` forces a full remount on success — a
    // fresh mount always re-initializes from its own default props,
    // regardless of how it manages its internal search/selection state.
    const [resetKey, setResetKey] = useState(0)
    const wasPending = useRef(false)

    useEffect(() => {
        if (wasPending.current && !isPending && state.ok) {
            setResetKey((prev) => prev + 1)
        }
        wasPending.current = isPending
    }, [isPending, state.ok])

    // Courses the currently-selected student is already enrolled in —
    // filtered out of the course SearchableSelect's options so they
    // can't be picked (re-submitting would just hit the DB's unique
    // constraint and surface enrollStudent's "already enrolled" error,
    // but filtering them out up front is the better UX).
    const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set())
    const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false)

    // Bumped every time the selected student changes, so the course
    // SearchableSelect remounts and clears out any previously-typed/
    // selected course — otherwise a course chosen before a student swap
    // could remain selected even after it's filtered out of the list.
    const [studentChangeKey, setStudentChangeKey] = useState(0)

    // Guards against an out-of-order response: if the student is
    // changed again before the in-flight lookup for the previous
    // student resolves, only the latest request's result should apply.
    const latestRequestId = useRef(0)

    async function handleStudentChange(studentId: string) {
        setStudentChangeKey((prev) => prev + 1)

        if (!studentId) {
            setEnrolledCourseIds(new Set())
            setIsLoadingEnrollments(false)
            return
        }

        const requestId = ++latestRequestId.current
        setIsLoadingEnrollments(true)
        try {
            const enrollments = await getStudentEnrollments(studentId)
            if (requestId !== latestRequestId.current) return // stale response
            setEnrolledCourseIds(new Set(enrollments.map((e) => e.courseId)))
        } finally {
            if (requestId === latestRequestId.current) setIsLoadingEnrollments(false)
        }
    }

    const availableCourses = courses.filter((course) => !enrolledCourseIds.has(course.id))

    return (
        <form action={formAction} className="bg-surface rounded-md shadow-card p-8 space-y-6">
            <div>
                <label htmlFor="studentId-search" className="text-label text-text-secondary block mb-2">
                    Student
                </label>
                <SearchableSelect
                    key={`student-${resetKey}`}
                    name="studentId"
                    required
                    placeholder="Search for a student…"
                    options={students.map((student) => ({
                        id: student.id,
                        label: student.full_name,
                        sublabel: student.email,
                    }))}
                    onChange={handleStudentChange}
                />
            </div>

            <div>
                <label htmlFor="courseId-search" className="text-label text-text-secondary block mb-2">
                    Classes
                </label>
                <SearchableSelect
                    key={`course-${resetKey}-${studentChangeKey}`}
                    name="courseId"
                    required
                    disabled={isLoadingEnrollments}
                    placeholder={
                        isLoadingEnrollments ? 'Checking enrollments…' : 'Search for a class…'
                    }
                    options={availableCourses.map((course) => ({
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
                className="w-full h-14 rounded-md bg-brand text-on-ink font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
            >
                {isPending ? 'Enrolling…' : 'Enroll student'}
            </button>
        </form>
    )
}