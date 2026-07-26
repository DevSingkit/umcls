'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAssignment } from '@/features/assignments/actions/assignments'

export function NewAssignmentForm({ courseId }: { courseId: string }) {
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [dueDate, setDueDate] = useState('')
    const [dueTime, setDueTime] = useState('')
    const router = useRouter()

    function handleSubmit(formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await createAssignment(courseId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.push(`/teacher/courses/${courseId}/assignments`)
            router.refresh()
        })
    }

    return (
        <form action={handleSubmit} className="max-w-xl grid gap-4 bg-surface rounded-md shadow-card p-8">
            {error && <p className="text-caption text-red">{error}</p>}
            <div>
                <label htmlFor="title" className="text-label text-ink-soft">Title</label>
                <input
                    id="title"
                    name="title"
                    required
                    className="mt-1 h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
            </div>
            <div>
                <label htmlFor="instructions" className="text-label text-ink-soft">Instructions</label>
                <textarea
                    id="instructions"
                    name="instructions"
                    rows={4}
                    className="mt-1 w-full px-4 py-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
            </div>
            <div>
                <label className="text-label text-ink-soft">Due date (optional)</label>
                <div className="mt-1 grid grid-cols-2 gap-3">
                    <input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <input
                        id="dueTime"
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>
                <input type="hidden" name="dueAt" value={dueDate ? `${dueDate}T${dueTime || '23:59'}` : ''} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="maxScore" className="text-label text-ink-soft">Max score</label>
                    <input
                        id="maxScore"
                        name="maxScore"
                        type="number"
                        min={1}
                        defaultValue={100}
                        required
                        className="mt-1 h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>
                <div>
                    <label htmlFor="passingScore" className="text-label text-ink-soft">Passing score</label>
                    <input
                        id="passingScore"
                        name="passingScore"
                        type="number"
                        min={0}
                        defaultValue={60}
                        required
                        className="mt-1 h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>
            </div>
            <button
                type="submit"
                disabled={isPending}
                className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60 justify-self-start"
            >
                {isPending ? 'Creating…' : 'Create assignment'}
            </button>
        </form>
    )
}