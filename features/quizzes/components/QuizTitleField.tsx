'use client'
// features/quizzes/components/QuizTitleField.tsx
// No longer styled as the page's h1 — the edit page now has its own
// static heading ("Create Quiz" / "Edit Quiz"), separate from the
// quiz's own name. This field lives in its own card instead, starts
// genuinely blank on a freshly created quiz (createDraftQuiz no longer
// inserts a placeholder "Untitled quiz" — see that function's own
// comment), and visibly asks for a name rather than silently reverting
// when left empty, so it reads as a required field, not just an
// editable label.
import { useState, useTransition } from 'react'
import { updateQuizTitle } from '@/features/quizzes/actions/create-quiz'

export function QuizTitleField({ quizId, initialTitle }: { quizId: string; initialTitle: string }) {
    const [title, setTitle] = useState(initialTitle)
    const [savedTitle, setSavedTitle] = useState(initialTitle)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function handleBlur() {
        const trimmed = title.trim()

        if (trimmed === savedTitle) {
            return
        }

        if (trimmed.length < 2) {
            // Don't silently snap back — a blank/too-short name is a
            // real problem the teacher needs to see and fix, not
            // something to quietly discard.
            setError('Give this quiz a name (at least 2 characters).')
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
                return
            }
            setSavedTitle(trimmed)
        })
    }

    return (
        <div className="bg-surface rounded-md border border-hairline shadow-card p-6">
            <label htmlFor="quizTitleField" className="text-label text-ink-soft block mb-2">
                Quiz name {!savedTitle && <span className="text-error">(required)</span>}
            </label>
            <input
                id="quizTitleField"
                value={title}
                onChange={(e) => {
                    setTitle(e.target.value)
                    if (error) setError(null)
                }}
                onBlur={handleBlur}
                placeholder="e.g. Chapter 3 Quiz"
                aria-label="Quiz name"
                aria-required="true"
                className={`w-full h-11 px-4 text-body-emphasis text-ink bg-surface rounded-md border-2 focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors ${
                    error ? 'border-error' : 'border-hairline focus:border-brand'
                }`}
            />
            {isPending && <p className="text-caption text-text-secondary mt-2">Saving…</p>}
            {error && <p className="text-caption text-error mt-2" role="alert">{error}</p>}
        </div>
    )
}
