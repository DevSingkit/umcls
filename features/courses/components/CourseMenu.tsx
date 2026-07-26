'use client'
// Course-level overflow menu — Google Classroom pattern: infrequent,
// consequential course actions (unpublish, edit, delete) live behind a
// ••• menu next to the title, not as standalone header buttons
// competing with CreateMenu's "+ Create" (DESIGN-LMS.md §8.1/§10 —
// one button-primary per screen; this replaces the old
// CoursePublishToggle button that used to sit in the header).
import { useRef, useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { toggleCoursePublish } from '@/features/courses/actions/courses'
import { deleteCourse } from '@/features/courses/actions/delete-course'

export function CourseMenu({
    courseId,
    isPublished,
}: {
    courseId: string
    isPublished: boolean
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [published, setPublished] = useState(isPublished)
    const [confirmingUnpublish, setConfirmingUnpublish] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
                setConfirmingUnpublish(false)
                setConfirmingDelete(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function handlePublishClick() {
        if (published) {
            setConfirmingUnpublish(true)
        } else {
            runToggle()
        }
    }

    function runToggle() {
        startTransition(async () => {
            const result = await toggleCoursePublish(courseId, !published)
            if (result.ok) {
                setPublished(!published)
                setConfirmingUnpublish(false)
                router.refresh()
            }
        })
    }

    function handleDelete() {
        setDeleteError(null)
        startTransition(async () => {
            const result = await deleteCourse(courseId)
            // deleteCourse redirects on success, so reaching here means
            // it failed — a successful call never returns.
            if (result && !result.ok) {
                setDeleteError(result.error)
            }
        })
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-label="Course options"
                className="flex h-11 w-11 items-center justify-center rounded-md border-[1.5px] border-hairline-strong text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
                <MoreVertical size={20} aria-hidden="true" />
            </button>

            {isOpen && !confirmingUnpublish && !confirmingDelete && (
                <div
                    role="menu"
                    className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-md bg-surface shadow-modal"
                >
                    <button
                        role="menuitem"
                        onClick={handlePublishClick}
                        disabled={isPending}
                        className="flex h-11 w-full items-center gap-3 px-4 text-left text-body-md text-ink hover:bg-surface-sunken disabled:opacity-60"
                    >
                        <span className={`h-2 w-2 rounded-pill ${published ? 'bg-brand' : 'bg-text-secondary'}`} aria-hidden="true" />
                        {published ? 'Unpublish' : 'Publish'}
                    </button>
                    <Link
                        href={`/teacher/courses/${courseId}/edit`}
                        role="menuitem"
                        onClick={() => setIsOpen(false)}
                        className="flex h-11 items-center gap-3 px-4 text-body-md text-ink hover:bg-surface-sunken"
                    >
                        <Pencil size={18} aria-hidden="true" className="text-text-secondary" />
                        Edit course
                    </Link>
                    <button
                        role="menuitem"
                        onClick={() => setConfirmingDelete(true)}
                        className="flex h-11 w-full items-center gap-3 px-4 text-left text-body-md text-red hover:bg-red-soft"
                    >
                        <Trash2 size={18} aria-hidden="true" />
                        Delete course
                    </button>
                </div>
            )}

            {confirmingUnpublish && (
                <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-md bg-surface p-4 shadow-modal">
                    <p className="text-body-emphasis text-ink">Unpublish this course?</p>
                    <p className="mt-1 text-caption text-text-secondary">
                        Students won&apos;t be able to see it anymore. You can publish it
                        again anytime — nothing is deleted.
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            onClick={() => setConfirmingUnpublish(false)}
                            className="h-11 rounded-md border-[1.5px] border-hairline-strong px-4 text-body-md text-ink hover:bg-surface-sunken"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={runToggle}
                            disabled={isPending}
                            className="h-11 rounded-md border-[1.5px] border-red px-4 text-body-md font-semibold text-red hover:bg-red-soft disabled:opacity-60"
                        >
                            Unpublish
                        </button>
                    </div>
                </div>
            )}

            {confirmingDelete && (
                <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-md bg-surface p-4 shadow-modal">
                    <p className="text-body-emphasis text-ink">Delete this course?</p>
                    <p className="mt-1 text-caption text-text-secondary">
                        This removes it and everything in it from view immediately. This can&apos;t
                        be undone from here.
                    </p>
                    {deleteError && <p className="mt-2 text-caption text-red">{deleteError}</p>}
                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            onClick={() => setConfirmingDelete(false)}
                            disabled={isPending}
                            className="h-11 rounded-md border-[1.5px] border-hairline-strong px-4 text-body-md text-ink hover:bg-surface-sunken disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isPending}
                            className="h-11 rounded-md bg-red px-4 text-body-md font-semibold text-on-ink hover:opacity-90 disabled:opacity-60"
                        >
                            {isPending ? 'Deleting…' : 'Delete'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
