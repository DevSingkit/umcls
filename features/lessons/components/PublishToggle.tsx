'use client'
// Small button that flips a lesson between draft and published. Only
// shown to the teacher who owns the lesson.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleLessonPublish } from '@/features/lessons/actions/get-lesson'

export function PublishToggle({
    lessonId,
    courseId,
    isPublished,
}: {
    lessonId: string
    courseId: string
    isPublished: boolean
}) {
    const [published, setPublished] = useState(isPublished)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    function handleClick() {
        startTransition(async () => {
            const result = await toggleLessonPublish(lessonId, courseId, !published)
            if (result.ok) {
                setPublished(!published)
                router.refresh()
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