'use client'
// Form to make a new quiz. Once it saves, it sends the teacher
// straight to the question builder so they can start adding questions.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuiz } from '@/features/quizzes/actions/create-quiz'

export function NewQuizForm({ courseId }: { courseId: string }) {
    const router = useRouter()
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsPending(true)
        setError('')
        const result = await createQuiz(formData)
        setIsPending(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        router.push(`/teacher/courses/${courseId}/quizzes/${result.quizId}/edit`)
    }

    return (
        <div className="max-w-xl">
            <h1 className="font-heading text-h1 text-ink mb-8">Create a new quiz</h1>

            <form
                action={handleSubmit}
                className="bg-surface rounded-md border border-hairline shadow-card p-8 space-y-6"
            >
                <input type="hidden" name="courseId" value={courseId} />

                <div>
                    <label htmlFor="title" className="text-label text-ink-soft block mb-2">
                        Quiz title
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        className="w-full min-h-[44px] px-5 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="e.g. Chapter 1 check"
                    />
                </div>

                <p className="text-caption text-text-secondary">
                    You&apos;ll set the passing score after adding your questions.
                </p>

                {error && (
                    <p className="text-caption text-red" role="alert">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-md bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md transition-colors disabled:opacity-60"
                >
                    {isPending ? 'Creating quiz…' : 'Create quiz and add questions'}
                </button>
            </form>
        </div>
    )
}
