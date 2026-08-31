'use client'
// List of every course with an Archive/Unarchive toggle. Client
// component since it needs local state to reflect the toggle
// immediately and show per-row errors, same pattern as UserList.tsx's
// Deactivate/Reactivate handling.
//
// Design pass: Archive is a button-danger action (§7.1) and per spec
// must open a confirm modal before firing — it previously fired on a
// single click with no warning, same bug class as UserList's old
// Deactivate button before that got its confirm dialog. Unarchive
// stays a single click since it's reversible/low-risk, matching how
// Reactivate is treated elsewhere.
//
// DESIGN-LMS 2.1 bugfix pass (2026-08-31): dead `red`/`red-soft`
// tokens -> `error`/`error-soft` (6 instances). `font-heading` removed
// from the modal title (Classroom Mode dialog, not Mission Mode).
// border-[1.5px] border-hairline-strong -> border-2 border-hairline.
// Touch-target floor applied: Unarchive/Archive row buttons h-11 ->
// h-14/h-12 (primary/secondary), modal Cancel/Archive h-10 -> h-12/h-14.

import { useState, useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
    archiveCourse,
    unarchiveCourse,
    type AdminCourseListRow,
} from '@/features/admin/actions/course-management'

export function AdminCourseList({ initialCourses }: { initialCourses: AdminCourseListRow[] }) {
    const [courses, setCourses] = useState(initialCourses)
    const [isPending, startTransition] = useTransition()
    const [errorByCourseId, setErrorByCourseId] = useState<Record<string, string>>({})
    const [archiveConfirmCourse, setArchiveConfirmCourse] = useState<AdminCourseListRow | null>(null)

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

    function confirmArchive() {
        if (!archiveConfirmCourse) return
        handleArchive(archiveConfirmCourse.id)
        setArchiveConfirmCourse(null)
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
        <>
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
                                    className="h-14 px-6 rounded-md bg-brand text-on-ink font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 shrink-0"
                                >
                                    Unarchive
                                </button>
                            ) : (
                                <button
                                    onClick={() => setArchiveConfirmCourse(course)}
                                    disabled={isPending}
                                    className="h-12 px-6 rounded-md border-2 border-error bg-surface text-error font-medium hover:bg-error-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 shrink-0"
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

            {archiveConfirmCourse && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="archive-confirm-title"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
                    onClick={() => setArchiveConfirmCourse(null)}
                >
                    <div
                        className="w-full max-w-sm rounded-md bg-surface p-6 shadow-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-error-soft">
                                <AlertTriangle className="h-5 w-5 text-error" strokeWidth={2} aria-hidden="true" />
                            </div>
                            <div>
                                <h2 id="archive-confirm-title" className="text-body-emphasis text-ink">
                                    Archive this class?
                                </h2>
                                <p className="mt-2 text-caption text-text-secondary">
                                    <span className="font-medium text-ink">{archiveConfirmCourse.title}</span>{' '}
                                    will disappear from its teacher and students&apos; dashboards. You can
                                    unarchive it again anytime — nothing is deleted.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setArchiveConfirmCourse(null)}
                                className="h-12 px-4 rounded-md border-2 border-hairline bg-surface text-ink text-caption font-medium hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmArchive}
                                disabled={isPending}
                                className="h-14 px-4 rounded-md bg-error text-on-ink text-caption font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                            >
                                {isPending ? 'Archiving…' : 'Archive'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
