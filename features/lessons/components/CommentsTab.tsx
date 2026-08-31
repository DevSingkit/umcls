'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { postLessonComment, deleteLessonComment } from '@/features/lessons/actions/lesson-comments'

type Comment = {
    id: string
    body: string
    created_at: string
    author_id: string
    users: { full_name: string; role: string } | null
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

    function handleDelete(commentId: string) {
        startTransition(async () => {
            await deleteLessonComment(commentId)
            router.refresh()
        })
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
                <div className="grid gap-3">
                    {comments.map((comment) => {
                        const canDelete = comment.author_id === currentUserId || isTeacher
                        return (
                            <div key={comment.id} className="bg-surface rounded-md shadow-card p-4">
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
                                <p className="text-body-md text-ink-soft whitespace-pre-wrap pl-9">{comment.body}</p>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}