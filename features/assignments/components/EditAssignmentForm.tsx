'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateAssignment } from '@/features/assignments/actions/assignments'

export function EditAssignmentForm({
    courseId,
    assignmentId,
    initialTitle,
    initialInstructions,
    initialDueAt,
    initialMaxScore,
    initialPassingScore,
}: {
    courseId: string
    assignmentId: string
    initialTitle: string
    initialInstructions: string
    initialDueAt: string // already formatted for datetime-local input, or ''
    initialMaxScore: number
    initialPassingScore: number
}) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleSave(formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await updateAssignment(formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.push(`/teacher/courses/${courseId}/assignments/${assignmentId}`)
        })
    }

    return (
        <div className="max-w-xl mx-auto pb-16">
            <h1 className="font-heading text-h1 text-ink mb-8">Edit assignment</h1>

            <form action={handleSave} className="bg-surface rounded-md shadow-card p-8 space-y-6">
                <input type="hidden" name="assignmentId" value={assignmentId} />

                <div>
                    <label htmlFor="title" className="block text-label text-ink mb-2">
                        Title
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        defaultValue={initialTitle}
                        className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="instructions" className="block text-label text-ink mb-2">
                        Instructions
                    </label>
                    <textarea
                        id="instructions"
                        name="instructions"
                        rows={6}
                        defaultValue={initialInstructions}
                        className="w-full px-4 py-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink leading-relaxed
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="dueAt" className="block text-label text-ink mb-2">
                        Due date (optional)
                    </label>
                    <input
                        id="dueAt"
                        name="dueAt"
                        type="datetime-local"
                        defaultValue={initialDueAt}
                        className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="maxScore" className="block text-label text-ink mb-2">
                            Max score
                        </label>
                        <input
                            id="maxScore"
                            name="maxScore"
                            type="number"
                            min={1}
                            required
                            defaultValue={initialMaxScore}
                            className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                       focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                    </div>
                    <div>
                        <label htmlFor="passingScore" className="block text-label text-ink mb-2">
                            Passing score
                        </label>
                        <input
                            id="passingScore"
                            name="passingScore"
                            type="number"
                            min={0}
                            required
                            defaultValue={initialPassingScore}
                            className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                       focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-caption text-red" role="alert">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-md bg-brand text-on-ink font-semibold text-body-md
                               hover:bg-brand-hover disabled:opacity-60 transition-colors"
                >
                    {isPending ? 'Saving…' : 'Save changes'}
                </button>
            </form>
        </div>
    )
}
