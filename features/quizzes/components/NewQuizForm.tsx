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
            <h1 className="text-display-xs text-ink mb-8">Create a new quiz</h1>

            <form action={handleSubmit} className="bg-white rounded-hero shadow-card-lift p-8 space-y-6">
                <input type="hidden" name="courseId" value={courseId} />

                <div>
                    <label htmlFor="title" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                        Quiz title
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        className="w-full h-11 px-5 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                        placeholder="e.g. Chapter 1 check"
                    />
                </div>

                <p className="text-caption-md text-graphite">
                    You will set the passing score after adding your questions.
                </p>

                {error && (
                    <p className="text-caption-md text-error" role="alert">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-button bg-ink text-white font-medium disabled:opacity-60"
                >
                    {isPending ? 'Creating quiz…' : 'Create quiz and add questions'}
                </button>
            </form>
        </div>
    )
}