'use client'
// List of every course with an Archive/Unarchive toggle. Client
// component since it needs local state to reflect the toggle
// immediately and show per-row errors, same pattern as UserList.tsx's
// Deactivate/Reactivate handling (including that fix — every action
// here checks result.ok and surfaces result.error, it doesn't silently
// do nothing on failure).

import { useState, useTransition } from 'react'
import {
    archiveCourse,
    unarchiveCourse,
    type AdminCourseListRow,
} from '@/features/admin/actions/course-management'

export function AdminCourseList({ initialCourses }: { initialCourses: AdminCourseListRow[] }) {
    const [courses, setCourses] = useState(initialCourses)
    const [isPending, startTransition] = useTransition()
    const [errorByCourseId, setErrorByCourseId] = useState<Record<string, string>>({})

    function handleArchive(courseId: string) {
        setErrorByCourseId((prev) => ({ ...prev, [courseId]: '' }))
        startTransition(async () => {
            const result = await archiveCourse(courseId)
            if (result.ok) {
                setCourses((prev) =>
                    prev.map((c) => (c.id === courseId ? { ...c, isArchived: true } : c))
                )
            } else {
                setErrorByCourseId((prev) => ({ ...prev, [courseId]: result.error }))
            }
        })
    }

    function handleUnarchive(courseId: string) {
        setErrorByCourseId((prev) => ({ ...prev, [courseId]: '' }))
        startTransition(async () => {
            const result = await unarchiveCourse(courseId)
            if (result.ok) {
                setCourses((prev) =>
                    prev.map((c) => (c.id === courseId ? { ...c, isArchived: false } : c))
                )
            } else {
                setErrorByCourseId((prev) => ({ ...prev, [courseId]: result.error }))
            }
        })
    }

    if (courses.length === 0) {
        return (
            <div className="bg-surface rounded-md shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary">No courses yet.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-3">
            {courses.map((course) => (
                <div
                    key={course.id}
                    className="bg-surface rounded-md shadow-card p-5 flex flex-col gap-3"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="text-body-emphasis text-ink">{course.title}</p>
                            <p className="text-caption text-text-secondary">
                                {course.subject ? `${course.subject} · ` : ''}
                                {course.teacherName}
                                {' · '}
                                <span className={course.isArchived ? 'text-error' : 'text-success'}>
                                    {course.isArchived ? 'Archived' : 'Active'}
                                </span>
                            </p>
                        </div>
                        {course.isArchived ? (
                            <button
                                onClick={() => handleUnarchive(course.id)}
                                disabled={isPending}
                                className="h-9 px-4 rounded-md bg-brand text-on-ink text-caption font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                            >
                                Unarchive
                            </button>
                        ) : (
                            <button
                                onClick={() => handleArchive(course.id)}
                                disabled={isPending}
                                className="h-9 px-4 rounded-md border-[1.5px] border-error bg-surface text-error text-caption font-medium hover:bg-error-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                            >
                                Archive
                            </button>
                        )}
                    </div>
                    {errorByCourseId[course.id] && (
                        <p className="text-caption text-error" role="alert">
                            {errorByCourseId[course.id]}
                        </p>
                    )}
                </div>
            ))}
        </div>
    )
}
