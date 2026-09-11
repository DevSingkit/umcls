'use client'
// features/assignments/components/PostAssignmentButton.tsx
// Same pattern as PostQuizButton — sits at the bottom of the
// assignment edit page. Assignments have no "must have content first"
// gate the way quizzes need at least one question, since title +
// instructions already exist by the time this renders, so posting is
// never disabled here.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAssignmentPublish } from '@/features/assignments/actions/assignments'

export function PostAssignmentButton({
    assignmentId,
    isPublished,
}: {
    assignmentId: string
    isPublished: boolean
}) {
    const router = useRouter()
    const [published, setPublished] = useState(isPublished)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function handleToggle(publish: boolean) {
        setError(null)
        startTransition(async () => {
            const result = await toggleAssignmentPublish(assignmentId, publish)
            if (!result.ok) {
                setError(result.error)
                return
            }
            setPublished(publish)
            router.refresh()
        })
    }

    if (published) {
        return (
            <div className="flex items-center justify-between gap-4 bg-brand-soft rounded-md p-5">
                <div>
                    <p className="text-body-emphasis text-brand">Posted</p>
                    <p className="text-caption text-text-secondary mt-0.5">
                        Students in this course can see this assignment.
                    </p>
                </div>
                <button
                    onClick={() => handleToggle(false)}
                    disabled={isPending}
                    className="h-12 px-5 rounded-md border-2 border-hairline text-body-md font-semibold text-ink hover:bg-surface-sunken disabled:opacity-60 shrink-0"
                >
                    {isPending ? 'Working…' : 'Unpost'}
                </button>
            </div>
        )
    }

    return (
        <div className="bg-surface rounded-md shadow-card p-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-body-emphasis text-ink">Not posted yet</p>
                    <p className="text-caption text-text-secondary mt-0.5">
                        Students will not see this assignment until you post it.
                    </p>
                </div>
                <button
                    onClick={() => handleToggle(true)}
                    disabled={isPending}
                    className="h-14 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60 shrink-0"
                >
                    {isPending ? 'Posting…' : 'Post'}
                </button>
            </div>
            {error && <p className="text-caption text-error mt-2">{error}</p>}
        </div>
    )
}
