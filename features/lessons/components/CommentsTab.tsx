'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { postLessonComment, deleteLessonComment } from '@/features/lessons/actions/lesson-comments'

type Comment = {
    id: string
    body: string
    created_at: string
    author_id: string
    parent_comment_id: string | null
    users: { full_name: string; role: string } | null
}

// Relative time, Google-Classroom-style ("2h ago", "3d ago") instead
// of a full timestamp — keeps the header row compact next to the name.
function timeAgo(isoDate: string): string {
    const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(isoDate).toLocaleDateString()
}

export function CommentsTab({
    lessonId,
    comments,
    currentUserId,
    isTeacher,
}: {
    lessonId: string
    comments: Comment[]
    currentUserId: string
    isTeacher: boolean
}) {
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)
    const router = useRouter()

    // Tracks which comment's reply box is open.
    const [replyingToId, setReplyingToId] = useState<string | null>(null)
    const [isReplyPending, startReplyTransition] = useTransition()

    function handleSubmit(formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await postLessonComment(lessonId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            formRef.current?.reset()
            router.refresh()
        })
    }

    function handleReplySubmit(parentCommentId: string, formData: FormData) {
        formData.set('parentCommentId', parentCommentId)
        startReplyTransition(async () => {
            const result = await postLessonComment(lessonId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            setReplyingToId(null)
            router.refresh()
        })
    }

    function handleDelete(commentId: string) {
        startTransition(async () => {
            await deleteLessonComment(commentId)
            router.refresh()
        })
    }

    // Single-level threading: top-level comments (parent_comment_id
    // null) each carry their own replies array, keyed off in one pass
    // rather than filtering the full list once per comment.
    const topLevelComments = comments.filter((c) => !c.parent_comment_id)
    const repliesByParentId = new Map<string, Comment[]>()
    for (const comment of comments) {
        if (!comment.parent_comment_id) continue
        const existing = repliesByParentId.get(comment.parent_comment_id) ?? []
        existing.push(comment)
        repliesByParentId.set(comment.parent_comment_id, existing)
    }

    function renderComment(comment: Comment, isReply: boolean) {
        const canDelete = comment.author_id === currentUserId || isTeacher
        const isReplying = replyingToId === comment.id
        return (
            <div key={comment.id} className="flex gap-3">
                <span
                    className={`shrink-0 rounded-pill bg-brand-soft text-brand flex items-center justify-center font-bold ${
                        isReply ? 'w-7 h-7 text-caption' : 'w-9 h-9 text-caption'
                    }`}
                >
                    {(comment.users?.full_name ?? '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-label text-ink">{comment.users?.full_name ?? 'Unknown'}</span>
                        {comment.users?.role === 'teacher' && (
                            <span className="text-caption text-text-secondary font-medium">(Teacher)</span>
                        )}
                        <span className="text-caption text-text-muted">· {timeAgo(comment.created_at)}</span>
                    </div>
                    <p className="text-body-md text-ink-soft whitespace-pre-wrap mt-0.5">{comment.body}</p>
                    <div className="flex items-center gap-4 mt-1">
                        {/* Replies don't get their own Reply button —
                            single-level threading only, same rule
                            postLessonComment's server-side comment
                            documents. */}
                        {!isReply && (
                            <button
                                type="button"
                                onClick={() => setReplyingToId(isReplying ? null : comment.id)}
                                className="text-caption font-medium text-text-secondary hover:text-ink"
                            >
                                Reply
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={() => handleDelete(comment.id)}
                                disabled={isPending}
                                className="text-caption text-error font-medium hover:underline disabled:opacity-60"
                            >
                                Delete
                            </button>
                        )}
                    </div>

                    {isReplying && (
                        <form
                            action={(formData) => handleReplySubmit(comment.id, formData)}
                            className="flex gap-3 mt-3"
                        >
                            <input
                                type="text"
                                name="body"
                                placeholder={`Reply to ${comment.users?.full_name ?? 'this comment'}...`}
                                required
                                maxLength={2000}
                                autoFocus
                                className="h-10 px-3 rounded-md bg-surface border-2 border-hairline text-body-md text-ink flex-1
                                           placeholder:text-text-muted focus:border-brand focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isReplyPending}
                                className="h-10 px-5 rounded-md bg-brand text-on-ink font-semibold text-caption hover:bg-brand-hover disabled:opacity-60 transition-colors"
                            >
                                {isReplyPending ? 'Posting…' : 'Reply'}
                            </button>
                        </form>
                    )}

                    {!isReply && (repliesByParentId.get(comment.id) ?? []).length > 0 && (
                        <div className="mt-4 space-y-4 pl-2 border-l-2 border-hairline">
                            {(repliesByParentId.get(comment.id) ?? []).map((reply) => renderComment(reply, true))}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            <form ref={formRef} action={handleSubmit} className="flex gap-3">
                <input
                    type="text"
                    name="body"
                    placeholder="Add a class comment..."
                    required
                    maxLength={2000}
                    className="h-11 px-4 rounded-md bg-surface border-2 border-hairline text-body-md text-ink flex-1
                               placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={isPending}
                    className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60 transition-colors"
                >
                    Post
                </button>
            </form>
            {error && <p className="text-caption text-error">{error}</p>}

            {comments.length === 0 ? (
                <p className="text-body-md text-text-secondary">No comments yet.</p>
            ) : (
                <div className="bg-surface rounded-md shadow-card p-4 space-y-5">
                    {topLevelComments.map((comment) => renderComment(comment, false))}
                </div>
            )}
        </div>
    )
}