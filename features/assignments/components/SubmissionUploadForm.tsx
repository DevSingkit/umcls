'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitAssignment } from '@/features/assignments/actions/submissions'

const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4'
const MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024

type Submission = {
    file_name: string
    submitted_at: string
    is_late: boolean
    status: string
    score: number | null
} | null

export function SubmissionUploadForm({
    assignmentId,
    maxScore,
    existing,
}: {
    assignmentId: string
    maxScore: number
    existing: Submission
}) {
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)
    const router = useRouter()

    function handleSubmit(formData: FormData) {
        setError(null)
        const file = formData.get('file')
        if (file instanceof File && file.size > MAX_FILE_SIZE_BYTES) {
            setError('File is too large. Max size is 40 MB.')
            return
        }
        startTransition(async () => {
            const result = await submitAssignment(assignmentId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            formRef.current?.reset()
            router.refresh()
        })
    }

    return (
        <div className="grid gap-4">
            {existing && (
                <div className="bg-surface rounded-md shadow-card p-6">
                    <p className="text-body-emphasis text-ink">{existing.file_name}</p>
                    <p className="text-caption text-text-secondary mt-1">
                        Submitted {new Date(existing.submitted_at).toLocaleString()}
                        {existing.is_late && ' — Late'}
                    </p>
                    <p className="text-caption mt-2">
                        {existing.status === 'graded' ? (
                            <span className="text-success">
                                Graded: {existing.score} / {maxScore}
                            </span>
                        ) : (
                            <span className="text-text-secondary">Awaiting grading</span>
                        )}
                    </p>
                </div>
            )}
            <form ref={formRef} action={handleSubmit} className="flex items-center gap-3">
                {error && <p className="text-caption text-red">{error}</p>}
                <input type="file" name="file" accept={ACCEPT} required className="text-caption text-text-secondary" />
                <button
                    type="submit"
                    disabled={isPending}
                    className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60"
                >
                    {isPending ? 'Submitting…' : existing ? 'Resubmit' : 'Submit'}
                </button>
            </form>
        </div>
    )
}