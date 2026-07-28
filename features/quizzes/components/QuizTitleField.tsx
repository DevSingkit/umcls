'use client'
// features/quizzes/components/QuizTitleField.tsx
// Replaces the old one-time "Quiz title" input from the removed
// /quizzes/new page — the title is just an editable field on the edit
// page now, saved on blur, same spirit as lesson/assignment titles
// being editable after creation.
import { useState, useTransition } from 'react'
import { updateQuizTitle } from '@/features/quizzes/actions/create-quiz'

export function QuizTitleField({ quizId, initialTitle }: { quizId: string; initialTitle: string }) {
    const [title, setTitle] = useState(initialTitle)
    const [savedTitle, setSavedTitle] = useState(initialTitle)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function handleBlur() {
        const trimmed = title.trim()
        if (trimmed === savedTitle || trimmed.length < 2) {
            setTitle(savedTitle)
            return
        }
        setError(null)
        startTransition(async () => {
            const formData = new FormData()
            formData.set('quizId', quizId)
            formData.set('title', trimmed)
            const result = await updateQuizTitle(formData)
            if (!result.ok) {
                setError(result.error)
                setTitle(savedTitle)
                return
            }
            setSavedTitle(trimmed)
        })
    }

    return (
        <div>
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleBlur}
                aria-label="Quiz title"
                className="font-heading text-h1 text-ink w-full bg-transparent border-b-[1.5px] border-transparent hover:border-hairline-strong focus:border-brand focus:outline-none transition-colors"
            />
            {isPending && <p className="text-caption text-text-secondary mt-1">Saving…</p>}
            {error && <p className="text-caption text-error mt-1">{error}</p>}
        </div>
    )
}
