'use client'
import { useRef, useState, useTransition, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
import { postLessonComment, deleteLessonComment, type LessonComment } from '@/features/lessons/actions/lesson-comments'
import { Avatar } from '@/components/ui/Avatar'

type Comment = LessonComment

type OptimisticCommentAction =
    | { type: 'add'; comment: Comment }
    | { type: 'delete'; commentId: string }

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

    const [replyingToId, setReplyingToId] = useState<string | null>(null)
    const [, startReplyTransition] = useTransition()

    const [optimisticComments, setOptimisticComments] = useOptimistic(
        comments,
        (state, action: OptimisticCommentAction) => {
            if (action.type === 'add') {
                return [...state, action.comment]
            }
            if (action.type === 'delete') {
                return state.filter((c) => c.id !== action.commentId && c.parent_comment_id !== action.commentId)
            }
            return state
        }
    )

    function handleSubmit(formData: FormData) {
        setError(null)
        const body = (formData.get('body') as string)?.trim()
        if (!body) return

        const tempComment: Comment = {
            id: `temp-${Date.now()}`,
            author_id: currentUserId,
            parent_comment_id: null,
            body,
            created_at: new Date().toISOString(),
            users: {
                full_name: 'You',
                avatar_url: null,
                role: isTeacher ? 'teacher' : 'student',
            },
        }

        formRef.current?.reset()

        startTransition(async () => {
            setOptimisticComments({ type: 'add', comment: tempComment })
            const result = await postLessonComment(lessonId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    function handleReplySubmit(parentCommentId: string, formData: FormData) {
        formData.set('parentCommentId', parentCommentId)
        const body = (formData.get('body') as string)?.trim()
        if (!body) return

        const tempReply: Comment = {
            id: `temp-${Date.now()}`,
            author_id: currentUserId,
            parent_comment_id: parentCommentId,
            body,
            created_at: new Date().toISOString(),
            users: {
                full_name: 'You',
                avatar_url: null,
                role: isTeacher ? 'teacher' : 'student',
            },
        }

        setReplyingToId(null)

        startReplyTransition(async () => {
            setOptimisticComments({ type: 'add', comment: tempReply })
            const result = await postLessonComment(lessonId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    function handleDelete(commentId: string) {
        startTransition(async () => {
            setOptimisticComments({ type: 'delete', commentId })
            await deleteLessonComment(commentId)
            router.refresh()
        })
    }

    const topLevelComments = optimisticComments.filter((c) => !c.parent_comment_id)
    const repliesByParentId = new Map<string, Comment[]>()
    for (const comment of optimisticComments) {
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
                <Avatar
                    fullName={comment.users?.full_name ?? '?'}
                    avatarUrl={comment.users?.avatar_url ?? null}
                    size={isReply ? 'sm' : 'md'}
                />
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
                                className="text-caption text-error font-medium hover:underline"
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
                                className="h-10 px-5 rounded-md bg-brand text-on-ink font-semibold text-caption hover:bg-brand-hover transition-colors"
                            >
                                Reply
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
                    className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover transition-colors"
                >
                    Post
                </button>
            </form>
            {error && <p className="text-caption text-error">{error}</p>}

            {optimisticComments.length === 0 ? (
                <p className="text-body-md text-text-secondary">No comments yet.</p>
            ) : (
                <div className="bg-surface rounded-md shadow-card p-4 space-y-5">
                    {topLevelComments.map((comment) => renderComment(comment, false))}
                </div>
            )}
        </div>
    )
}