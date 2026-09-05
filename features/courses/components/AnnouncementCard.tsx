'use client'
// features/courses/components/AnnouncementCard.tsx
//
// Phase 3.8: renders one announcement post + its comment thread.
// Shared by both CourseStream.tsx (student) and TeacherCourseStream.tsx
// (teacher) — same card either way, the only difference is whether
// `canManagePost` is true (teacher, their own course) vs. false
// (student, read + comment only).
//
// Comment thread section mirrors CommentsTab.tsx's compose-box +
// list-with-per-comment-delete pattern as closely as possible, since
// that's the established convention for "a post with comments"
// elsewhere in this app — not inventing a new comment UI style.
// Comments are already fully loaded via props (listAnnouncementsForCourse
// fetches them eagerly server-side), so expand/collapse here is a pure
// client-side visibility toggle, no fetch-on-click.
//
// DESIGN-LMS 2.1 REDESIGN (2026-09-06): pure visual pass, no logic
// touched — editAnnouncement/postAnnouncementComment/
// deleteAnnouncementComment calls and all state machines unchanged.
// Three fixes:
//   1. The edit textarea and the comment input both used the one-off
//      `border-[1.5px] border-hairline-strong` — aligned to the
//      standard `border-2 border-hairline` convention used everywhere
//      else (InquiryForm, New Course, AnnouncementComposer).
//   2. The inline edit form's Save/Cancel buttons were h-9 (36px),
//      under §1.4's 48px secondary floor — bumped to h-12.
//   3. The comment "Post" button was h-11 (44px), also under the
//      floor — bumped to h-12. Added `items-center` to that row's flex
//      container so the now-taller button still aligns cleanly against
//      the paired h-11 comment input (Classroom Mode inputs
//      deliberately stay at 44px, not bumped) instead of stretching to
//      match it.
import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, MessageCircle } from 'lucide-react'
import { postAnnouncementComment, deleteAnnouncementComment } from '@/features/courses/actions/announcement-comments'
import { editAnnouncement } from '@/features/courses/actions/announcements'
import { AnnouncementItemMenu } from '@/features/courses/components/AnnouncementItemMenu'
import type { Announcement } from '@/features/courses/actions/announcements'

export function AnnouncementCard({
    announcement,
    currentUserId,
    isTeacher,
}: {
    announcement: Announcement
    currentUserId: string
    isTeacher: boolean
}) {
    const router = useRouter()
    const [isExpanded, setIsExpanded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)

    // PHASE 3.8b ADDITIONS (new conversation, same project): inline
    // edit mode replaces the old standalone "Delete" text button —
    // both Edit and Delete now live behind AnnouncementItemMenu,
    // matching StreamItemMenu's pattern used everywhere else in the
    // stream (confirmed by reading that file before building the
    // sibling menu component, not guessed).
    const [isEditing, setIsEditing] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)
    const editFormRef = useRef<HTMLFormElement>(null)

    // Only the teacher who owns this course can delete OR edit the
    // POST itself (RLS enforces both — see migration 088's "Teachers
    // manage announcements on their own courses" policy). A comment's
    // own delete permission is separate — author-of-that-comment OR
    // isTeacher, same as CommentsTab.tsx's canDelete logic.
    const canManagePost = isTeacher

    function handleSaveEdit(formData: FormData) {
        setEditError(null)
        startTransition(async () => {
            const result = await editAnnouncement(announcement.id, formData)
            if (!result.ok) {
                setEditError(result.error)
                return
            }
            setIsEditing(false)
            router.refresh()
        })
    }

    function handlePostComment(formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await postAnnouncementComment(announcement.id, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            formRef.current?.reset()
            router.refresh()
        })
    }

    function handleDeleteComment(commentId: string) {
        startTransition(async () => {
            await deleteAnnouncementComment(commentId)
            router.refresh()
        })
    }

    return (
        <div className="rounded-md bg-surface p-5 shadow-card">
            <div className="flex items-start gap-3">
                <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-info-soft text-info"
                    aria-hidden="true"
                >
                    <Megaphone size={20} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-caption font-semibold text-text-secondary">
                            {announcement.authorName} · {new Date(announcement.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                        {canManagePost && !isEditing && (
                            <AnnouncementItemMenu
                                announcementId={announcement.id}
                                preview={
                                    announcement.body.length > 60
                                        ? `${announcement.body.slice(0, 60)}…`
                                        : announcement.body
                                }
                                onEdit={() => setIsEditing(true)}
                            />
                        )}
                    </div>

                    {isEditing ? (
                        <form ref={editFormRef} action={handleSaveEdit} className="mt-2 grid gap-3">
                            <textarea
                                name="body"
                                autoFocus
                                required
                                rows={3}
                                maxLength={5000}
                                defaultValue={announcement.body}
                                className="w-full px-4 py-3 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                            />
                            {editError && <p className="text-caption text-error">{editError}</p>}
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditError(null)
                                        setIsEditing(false)
                                    }}
                                    className="h-12 px-5 rounded-md text-body-md font-semibold text-text-secondary hover:bg-surface-sunken transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="h-12 px-5 rounded-md bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md transition-colors disabled:opacity-60"
                                >
                                    {isPending ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <p className="text-body-md text-ink whitespace-pre-wrap mt-1">{announcement.body}</p>
                    )}

                    <button
                        onClick={() => setIsExpanded((prev) => !prev)}
                        className="flex items-center gap-1.5 text-caption font-semibold text-text-secondary hover:text-ink mt-3"
                    >
                        <MessageCircle size={16} aria-hidden="true" />
                        {announcement.comments.length === 0
                            ? 'Add class comment'
                            : `${announcement.comments.length} comment${announcement.comments.length === 1 ? '' : 's'}`}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-4 pl-14 grid gap-4">
                    <form ref={formRef} action={handlePostComment} className="flex items-center gap-3">
                        <input
                            type="text"
                            name="body"
                            placeholder="Add a class comment..."
                            required
                            maxLength={2000}
                            className="h-11 px-4 rounded-md border-2 border-hairline text-body-md text-ink flex-1
                                       focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                        <button
                            type="submit"
                            disabled={isPending}
                            className="h-12 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60 transition-colors"
                        >
                            Post
                        </button>
                    </form>
                    {error && <p className="text-caption text-error">{error}</p>}

                    {announcement.comments.length > 0 && (
                        <div className="grid gap-3">
                            {announcement.comments.map((comment) => {
                                const canDeleteComment = comment.author_id === currentUserId || isTeacher
                                return (
                                    <div key={comment.id} className="bg-surface-sunken rounded-md p-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="flex items-center gap-2 text-label text-ink">
                                                <span className="w-7 h-7 rounded-pill bg-brand-soft text-brand flex items-center justify-center text-caption font-bold">
                                                    {(comment.users?.full_name ?? '?').charAt(0).toUpperCase()}
                                                </span>
                                                {comment.users?.full_name ?? 'Unknown'}
                                                {comment.users?.role === 'teacher' && (
                                                    <span className="text-text-secondary font-medium">(Teacher)</span>
                                                )}
                                            </span>
                                            {canDeleteComment && (
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    disabled={isPending}
                                                    className="text-caption text-error font-medium hover:underline disabled:opacity-60"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-body-md text-ink-soft whitespace-pre-wrap pl-9">{comment.body}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
