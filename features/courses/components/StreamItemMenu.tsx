'use client'
// Per-row overflow menu for a lesson/quiz/assignment stream item —
// Google Classroom pattern: Edit + Delete live behind one ⋮ menu per
// row, not standalone buttons cluttering the card. Publish/unpublish
// no longer exists for these item types — they're visible the moment
// they're created (DB column default, see migration 047).
import { useRef, useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { deleteStreamItem } from '@/features/courses/actions/delete-stream-item'
import type { TeacherStreamItemType } from '@/features/courses/actions/get-teacher-course-stream'

export function StreamItemMenu({
    type,
    itemId,
    itemTitle,
    editHref,
}: {
    type: TeacherStreamItemType
    itemId: string
    itemTitle: string
    editHref: string
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
                setConfirmingDelete(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function handleDelete() {
        setError(null)
        startTransition(async () => {
            const result = await deleteStreamItem(type, itemId)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-label={`Options for ${itemTitle}`}
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-sunken transition-colors"
            >
                <MoreVertical size={18} aria-hidden="true" />
            </button>

            {isOpen && !confirmingDelete && (
                <div
                    role="menu"
                    className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-md bg-surface shadow-modal"
                >
                    <a
                        href={editHref}
                        role="menuitem"
                        className="flex h-10 items-center gap-3 px-4 text-body-md text-ink hover:bg-surface-sunken"
                    >
                        <Pencil size={16} aria-hidden="true" className="text-text-secondary" />
                        Edit
                    </a>
                    <button
                        role="menuitem"
                        onClick={() => setConfirmingDelete(true)}
                        className="flex h-10 w-full items-center gap-3 px-4 text-left text-body-md text-red hover:bg-red-soft"
                    >
                        <Trash2 size={16} aria-hidden="true" />
                        Delete
                    </button>
                </div>
            )}

            {confirmingDelete && (
                <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-md bg-surface p-4 shadow-modal">
                    <p className="text-body-emphasis text-ink">Delete &quot;{itemTitle}&quot;?</p>
                    <p className="mt-1 text-caption text-text-secondary">
                        Students will lose access immediately. This can&apos;t be undone from here.
                    </p>
                    {error && <p className="mt-2 text-caption text-red">{error}</p>}
                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            onClick={() => setConfirmingDelete(false)}
                            disabled={isPending}
                            className="h-9 rounded-md border-[1.5px] border-hairline-strong px-3 text-caption text-ink hover:bg-surface-sunken disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isPending}
                            className="h-9 rounded-md border-[1.5px] border-red px-3 text-caption font-semibold text-red hover:bg-red-soft disabled:opacity-60"
                        >
                            {isPending ? 'Deleting…' : 'Delete'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
