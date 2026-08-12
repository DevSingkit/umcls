'use client'
// Course-level switch: whether students can see their own Final Grade
// for this course. Defaults off (migration 074). Toggling calls
// setGradesVisibility, shared between teacher and admin.

import { useState, useTransition } from 'react'
import { setGradesVisibility } from '@/features/grades/actions/gradebook-items'

export function GradesVisibilityToggle({
    courseId,
    initialVisible,
}: {
    courseId: string
    initialVisible: boolean
}) {
    const [visible, setVisible] = useState(initialVisible)
    const [error, setError] = useState('')
    const [isPending, startTransition] = useTransition()

    function handleToggle() {
        const next = !visible
        setError('')
        startTransition(async () => {
            const result = await setGradesVisibility(courseId, next)
            if (!result.ok) {
                setError(result.error)
                return
            }
            setVisible(next)
        })
    }

    return (
        <div className="bg-surface rounded-md border border-hairline shadow-card p-4 mb-4 flex items-center justify-between gap-4">
            <div>
                <p className="text-body-emphasis text-ink">Students can see their Final Grade</p>
                <p className="text-caption text-text-secondary mt-1">
                    {visible
                        ? 'Students enrolled in this course can see their own Final Grade on their grades page.'
                        : "Hidden — students see this course listed but no grade until you turn this on."}
                </p>
                {error && <p className="text-caption text-error mt-1">{error}</p>}
            </div>
            <button
                onClick={handleToggle}
                disabled={isPending}
                role="switch"
                aria-checked={visible}
                className={`shrink-0 h-6 w-11 rounded-pill relative transition-colors disabled:opacity-60 border ${
                    visible ? 'bg-brand border-brand' : 'bg-hairline border-hairline-strong'
                }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-pill bg-surface shadow transition-transform ${
                        visible ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    )
}
