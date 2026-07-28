'use client'
// features/quizzes/components/PostQuizButton.tsx
// Sits at the bottom of the quiz edit page — the quiz is a draft until
// the teacher explicitly clicks Post here, matching Classroom's
// "Assign" pattern. Replaces the earlier header-row PublishQuizToggle;
// same underlying toggleQuizPublish action, different placement and
// framing (a deliberate "post it" action, not a background toggle).
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleQuizPublish } from '@/features/quizzes/actions/create-quiz'

export function PostQuizButton({
    quizId,
    isPublished,
    hasQuestions,
}: {
    quizId: string
    isPublished: boolean
    hasQuestions: boolean
}) {
    const router = useRouter()
    const [published, setPublished] = useState(isPublished)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function handleToggle(publish: boolean) {
        setError(null)
        startTransition(async () => {
            const result = await toggleQuizPublish(quizId, publish)
            if (!result.ok) {
                setError('Could not update this quiz. Please try again.')
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
                        Students in this course can see this quiz.
                    </p>
                </div>
                <button
                    onClick={() => handleToggle(false)}
                    disabled={isPending}
                    className="h-11 px-5 rounded-md border-[1.5px] border-hairline-strong text-body-md font-semibold text-ink hover:bg-surface-sunken disabled:opacity-60 shrink-0"
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
                        {hasQuestions
                            ? 'Students will not see this quiz until you post it.'
                            : 'Add at least one question before posting.'}
                    </p>
                </div>
                <button
                    onClick={() => handleToggle(true)}
                    disabled={isPending || !hasQuestions}
                    className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60 shrink-0"
                >
                    {isPending ? 'Posting…' : 'Post'}
                </button>
            </div>
            {error && <p className="text-caption text-error mt-2">{error}</p>}
        </div>
    )
}
