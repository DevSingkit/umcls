'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitAssignment, unsubmitAssignment } from '@/features/assignments/actions/submissions'

const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4'
const MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024

type Submission = {
    file_name: string | null
    response_text: string | null
    submitted_at: string
    is_late: boolean
    status: string
    score: number | null
    feedback: string | null
} | null

export function SubmissionUploadForm({
    assignmentId,
    maxScore,
    existing,
    dueAt,
    allowLate,
}: {
    assignmentId: string
    maxScore: number
    existing: Submission
    dueAt: string | null
    allowLate: boolean
}) {
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isUnsubmitting, startUnsubmitting] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)
    const router = useRouter()

    const isPastDue = dueAt ? new Date(dueAt).getTime() < Date.now() : false
    // Hard lock, matching the server-side gate in submitAssignment /
    // unsubmitAssignment — once the due date has passed, this only
    // stays open if the teacher explicitly allowed late submissions.
    const isLocked = isPastDue && !allowLate
    // Unsubmitting a graded/returned submission isn't offered at all —
    // the server would refuse it anyway (see unsubmitAssignment), but
    // hiding the button here avoids a confusing "why didn't that work"
    // click for something that was never going to succeed.
    const canUnsubmit = !isLocked && !!existing && existing.status !== 'graded' && existing.status !== 'returned'

    function handleSubmit(formData: FormData) {
        setError(null)
        const file = formData.get('file')
        const note = formData.get('note')
        const hasFile = file instanceof File && file.size > 0
        const hasNote = typeof note === 'string' && note.trim().length > 0

        if (file instanceof File && file.size > MAX_FILE_SIZE_BYTES) {
            setError('File is too large. Max size is 40 MB.')
            return
        }

        if (!hasFile && !hasNote) {
            const proceed = window.confirm(
                "You haven't attached a file or written a note. Submit anyway?"
            )
            if (!proceed) return
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

    function handleUnsubmit() {
        const proceed = window.confirm(
            'Unsubmit this assignment? You can edit it and submit again before the deadline.'
        )
        if (!proceed) return
        setError(null)
        startUnsubmitting(async () => {
            const result = await unsubmitAssignment(assignmentId)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    return (
        <div className="grid gap-4">
            {existing && (
                <div className="bg-surface rounded-md shadow-card p-6">
                    {existing.file_name && <p className="text-body-emphasis text-ink">{existing.file_name}</p>}
                    {existing.response_text && (
                        <p className="text-body-md text-ink whitespace-pre-wrap mt-1">{existing.response_text}</p>
                    )}
                    <p className="text-caption text-text-secondary mt-1">
                        Submitted {new Date(existing.submitted_at).toLocaleString()}
                        {existing.is_late && ' — Late'}
                    </p>
                    <p className="text-caption mt-2">
                        {existing.status === 'returned' ? (
                            <span className="text-success">
                                Graded: {existing.score} / {maxScore}
                            </span>
                        ) : (
                            <span className="text-text-secondary">Awaiting grading</span>
                        )}
                    </p>
                    {existing.status === 'returned' && existing.feedback && (
                        <div className="mt-3 pt-3 border-t border-hairline">
                            <p className="text-caption font-semibold text-text-secondary mb-1">
                                Feedback from your teacher
                            </p>
                            <p className="text-body-md text-ink whitespace-pre-wrap">{existing.feedback}</p>
                        </div>
                    )}
                    {canUnsubmit && (
                        <button
                            type="button"
                            onClick={handleUnsubmit}
                            disabled={isUnsubmitting}
                            className="mt-4 text-caption font-medium text-error hover:underline disabled:opacity-60"
                        >
                            {isUnsubmitting ? 'Unsubmitting…' : 'Unsubmit'}
                        </button>
                    )}
                </div>
            )}

            {error && <p className="text-caption text-error">{error}</p>}

            {isLocked ? (
                <div className="bg-surface-sunken rounded-md p-4">
                    <p className="text-caption text-text-secondary">
                        The due date has passed and late submissions aren't allowed for this
                        assignment.
                        {existing ? ' Your submission above is final.' : ' You can no longer submit.'}
                    </p>
                </div>
            ) : (
                <form ref={formRef} action={handleSubmit} className="grid gap-3">
                    <textarea
                        name="note"
                        rows={3}
                        defaultValue={existing?.response_text ?? ''}
                        placeholder="Add a note (optional)"
                        className="w-full px-4 py-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink leading-relaxed
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <div className="flex items-center gap-3 flex-wrap">
                        <input
                            type="file"
                            name="file"
                            accept={ACCEPT}
                            className="text-caption text-text-secondary"
                        />
                        <button
                            type="submit"
                            disabled={isPending}
                            className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60"
                        >
                            {isPending ? 'Submitting…' : existing ? 'Resubmit' : 'Submit'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
