'use client'
import { useState, useTransition } from 'react'
import { toggleShowClassmates } from '@/features/courses/actions/courses'

export function ClassmatesVisibilityToggle({
    courseId,
    initialShowClassmates,
}: {
    courseId: string
    initialShowClassmates: boolean
}) {
    const [show, setShow] = useState(initialShowClassmates)
    const [isPending, startTransition] = useTransition()

    function handleToggle() {
        const next = !show
        setShow(next) // optimistic
        startTransition(async () => {
            const result = await toggleShowClassmates(courseId, next)
            if (!result.ok) setShow(!next) // revert on failure
        })
    }

    return (
        <label className="flex items-center gap-3 text-body-md text-ink">
            <input
                type="checkbox"
                checked={show}
                disabled={isPending}
                onChange={handleToggle}
                className="h-5 w-5 accent-brand"
            />
            Let students see who else is enrolled in this course
        </label>
    )
}
