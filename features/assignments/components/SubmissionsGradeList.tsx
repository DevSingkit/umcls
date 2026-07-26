'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { gradeSubmission, getSubmissionDownloadUrl, returnSubmission } from '@/features/assignments/actions/submissions'
import { cn } from '@/lib/utils'

type Row = {
    studentId: string
    studentName: string
    submission: {
        id: string
        file_name: string
        submitted_at: string
        is_late: boolean
        status: string
        score: number | null
        feedback: string | null
    } | null
}

function StatusBadge({ tone, children }: { tone: 'amber' | 'slate'; children: React.ReactNode }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-pill px-2 py-0.5 text-caption font-semibold',
                tone === 'amber' && 'bg-amber-soft text-amber',
                tone === 'slate' && 'bg-hairline text-text-secondary'
            )}
        >
            {children}
        </span>
    )
}

export function SubmissionsGradeList({ rows, maxScore }: { rows: Row[]; maxScore: number }) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    async function handleDownload(submissionId: string) {
        const url = await getSubmissionDownloadUrl(submissionId)
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
    }

    function handleGrade(submissionId: string, formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await gradeSubmission(submissionId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            setEditingId(null)
            router.refresh()
        })
    }

    function handleReturn(submissionId: string) {
        setError(null)
        startTransition(async () => {
            const result = await returnSubmission(submissionId)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    return (
        <div className="grid gap-3">
            {error && <p className="text-caption text-red">{error}</p>}
            {rows.map((row) => (
                <div
                    key={row.studentId}
                    className="bg-surface rounded-md shadow-card p-4 flex items-center justify-between gap-4"
                >
                    <div className="flex-1">
                        <p className="text-body-emphasis text-ink">{row.studentName}</p>
                        {row.submission ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownload(row.submission!.id)}
                                    className="text-caption text-text-secondary hover:underline"
                                >
                                    {row.submission.file_name}
                                </button>
                                {row.submission.is_late && <StatusBadge tone="slate">Late</StatusBadge>}
                                {row.submission.status === 'resubmitted' && (
                                    <StatusBadge tone="amber">Resubmitted</StatusBadge>
                                )}
                            </div>
                        ) : (
                            <p className="text-caption text-text-secondary">No submission yet</p>
                        )}
                    </div>

                    {row.submission && (
                        <div className="flex items-center gap-3">
                            {editingId === row.submission.id ? (
                                <form
                                    action={(fd) => handleGrade(row.submission!.id, fd)}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="number"
                                        name="score"
                                        min={0}
                                        max={maxScore}
                                        defaultValue={row.submission.score ?? ''}
                                        required
                                        className="h-9 w-20 px-2 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink"
                                    />
                                    <span className="text-caption text-text-secondary">/ {maxScore}</span>
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="h-9 px-4 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover disabled:opacity-60"
                                    >
                                        Save
                                    </button>
                                </form>
                            ) : (
                                <>
                                    <span className="text-caption text-ink">
                                        {row.submission.status === 'graded' || row.submission.status === 'returned'
                                            ? `${row.submission.score} / ${maxScore}`
                                            : row.submission.status === 'resubmitted'
                                                ? 'Needs re-grading'
                                                : 'Ungraded'}
                                    </span>
                                    <button
                                        onClick={() => setEditingId(row.submission!.id)}
                                        className="text-caption text-text-secondary hover:underline"
                                    >
                                        {row.submission.status === 'graded' || row.submission.status === 'returned'
                                            ? 'Edit'
                                            : 'Grade'}
                                    </button>
                                    {row.submission.status === 'graded' && (
                                        <button
                                            onClick={() => handleReturn(row.submission!.id)}
                                            disabled={isPending}
                                            className="h-9 px-4 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover disabled:opacity-60"
                                        >
                                            Return to student
                                        </button>
                                    )}
                                    {row.submission.status === 'returned' && (
                                        <span className="text-caption text-success">Returned</span>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}