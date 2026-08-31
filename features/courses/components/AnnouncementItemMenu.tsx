'use client'
// features/courses/components/AnnouncementItemMenu.tsx
//
// Sibling to StreamItemMenu.tsx, not a reuse of it — deliberately, for
// two reasons confirmed by actually reading that file before building
// this one:
//   1. StreamItemMenu calls deleteStreamItem(type, itemId), which
//      dispatches to per-type RPCs (delete_lesson/delete_quiz/
//      delete_assignment). Its `type` prop is typed as
//      TeacherStreamItemType, which deliberately does NOT include
//      'announcement' (see get-teacher-course-stream.ts's own note
//      from the prior session — widening that type would break the
//      RPC-dispatch record it's keyed against). Announcements delete
//      through deleteAnnouncement instead, a plain soft-delete, no RPC.
//   2. StreamItemMenu's Edit item is a plain <a href={editHref}> to a
//      dedicated edit PAGE. Announcements have no edit page — they're
//      inline content (confirmed last session: composer is inline,
//      not a page). So Edit here calls an onEdit() callback instead,
//      letting AnnouncementCard switch itself into inline edit mode.
//
// Visual chrome (⋮ trigger, dropdown, confirm-delete step) is copied
// as closely as possible from StreamItemMenu so an announcement's menu
// looks and behaves identically to every other stream item's menu —
// same component shape, different wiring underneath.

import { useRef, useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { deleteAnnouncement } from '@/features/courses/actions/announcements'

export function AnnouncementItemMenu({
    announcementId,
    // A short preview of the announcement body, NOT a title (announcements
    // have none) — used only for the confirm-delete copy, same role
    // itemTitle plays in StreamItemMenu's confirm step.
    preview,
    onEdit,
}: {
    announcementId: string
    preview: string
    onEdit: () => void
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
            const result = await deleteAnnouncement(announcementId)
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
                aria-label="Options for this announcement"
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-sunken transition-colors"
            >
                <MoreVertical size={18} aria-hidden="true" />
            </button>

            {isOpen && !confirmingDelete && (
                <div
                    role="menu"
                    className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-md bg-surface shadow-modal"
                >
                    <button
                        role="menuitem"
                        onClick={() => {
                            setIsOpen(false)
                            onEdit()
                        }}
                        className="flex h-10 w-full items-center gap-3 px-4 text-left text-body-md text-ink hover:bg-surface-sunken"
                    >
                        <Pencil size={16} aria-hidden="true" className="text-text-secondary" />
                        Edit
                    </button>
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
                    <p className="text-body-emphasis text-ink">Delete this announcement?</p>
                    <p className="mt-1 text-caption text-text-secondary">
                        &quot;{preview}&quot; — students will lose access immediately. This can&apos;t be undone
                        from here.
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
