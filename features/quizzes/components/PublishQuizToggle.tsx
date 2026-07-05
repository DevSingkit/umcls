'use client'
// Small button to switch a quiz between draft and published, same
// pattern as the lesson publish toggle.

import { useState, useTransition } from 'react'
import { toggleQuizPublish } from '@/features/quizzes/actions/create-quiz'

export function PublishQuizToggle({
    quizId,
    isPublished,
}: {
    quizId: string
    isPublished: boolean
}) {
    const [published, setPublished] = useState(isPublished)
    const [isPending, startTransition] = useTransition()

    function handleClick() {
        startTransition(async () => {
            const result = await toggleQuizPublish(quizId, !published)
            if (result.ok) {
                setPublished(!published)
            }
        })
    }

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            className="h-11 px-6 rounded-button border border-hairline text-caption-md font-medium disabled:opacity-60"
        >
            {published ? 'Unpublish' : 'Publish'}
        </button>
    )
}