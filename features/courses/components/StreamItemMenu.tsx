'use client'
// Per-row overflow menu for a lesson/quiz/assignment stream item —
// Google Classroom pattern: Edit + Delete live behind one ⋮ menu per
// row, not standalone buttons cluttering the card. Publish/unpublish
// no longer exists for these item types — they're visible the moment
// they're created (DB column default, see migration 047).
//
// DESIGN-LMS 2.1 REDESIGN (2026-09-06): pure visual pass, no logic
// touched — deleteStreamItem call, click-outside handling, and
// confirm-delete state machine unchanged. Three fixes:
//   1. `text-red` / `bg-red-soft` / `border-red` aren't real tokens
//      (only `error` / `error.soft` / `error.border` exist in
//      tailwind.config.ts) — same dead-token bug class caught
//      elsewhere in this track. Fixed to `text-error` / `bg-error-soft`
//      / `border-error`.
//   2. The menu trigger (h-9/36px), menu items (h-10/40px), and the
//      delete-confirm Cancel/Delete buttons (h-9/36px) were all under
//      §1.4's 48px secondary touch-target floor — bumped to h-12
//      throughout, same standing fix applied elsewhere on sight.
//   3. The confirm dialog's Cancel button used the one-off
//      `border-[1.5px] border-hairline-strong` — aligned to the
//      standard `border-2 border-hairline` convention used everywhere
//      else.
import { useRef, useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-label={`Options for ${itemTitle}`}
                className="flex h-12 w-12 min-h-touch min-w-touch items-center justify-center rounded-md text-text-secondary hover:bg-surface-sunken transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
                <MoreVertical size={18} aria-hidden="true" />
            </button>

            {isOpen && !confirmingDelete && (
                <div
                    role="menu"
                    className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-md bg-surface shadow-modal border border-hairline"
                >
                    <Link
                        href={editHref}
                        role="menuitem"
                        onClick={() => setIsOpen(false)}
                        className="flex h-12 min-h-touch items-center gap-3 px-4 text-body-md text-ink hover:bg-surface-sunken transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
                    >
                        <Pencil size={16} aria-hidden="true" className="text-text-secondary" />
                        Edit
                    </Link>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => setConfirmingDelete(true)}
                        className="flex h-12 min-h-touch w-full items-center gap-3 px-4 text-left text-body-md text-error hover:bg-error-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-inset"
                    >
                        <Trash2 size={16} aria-hidden="true" />
                        Delete
                    </button>
                </div>
            )}

            {confirmingDelete && (
                <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-md bg-surface p-4 shadow-modal border border-hairline">
                    <p className="text-body-emphasis text-ink">Delete &quot;{itemTitle}&quot;?</p>
                    <p className="mt-1 text-caption text-text-secondary">
                        Students will lose access immediately. This can&apos;t be undone from here.
                    </p>
                    {error && <p className="mt-2 text-caption text-error">{error}</p>}
                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setConfirmingDelete(false)}
                            disabled={isPending}
                            className="h-12 min-h-touch rounded-md border-2 border-hairline px-4 text-body-md text-ink hover:bg-surface-sunken transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isPending}
                            className="h-12 min-h-touch rounded-md border-2 border-error px-4 text-body-md font-semibold text-error hover:bg-error-soft transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-1"
                        >
                            {isPending ? 'Deleting…' : 'Delete'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
