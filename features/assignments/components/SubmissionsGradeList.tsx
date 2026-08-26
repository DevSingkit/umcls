'use client'
// Updated for multiple files per submission (migration 085,
// submissions.ts) — a submission's single file_name/getSubmissionDownloadUrl
// is replaced with a files[] array, each downloadable independently via
// getSubmissionFileDownloadUrl(fileId). Everything else (grading,
// returning, notes, badges) is unchanged.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { gradeSubmission, getSubmissionFileDownloadUrl, returnSubmission } from '@/features/assignments/actions/submissions'
import { cn } from '@/lib/utils'

type SubmissionFile = { id: string; file_name: string }

type Row = {
    studentId: string
    studentName: string
    submission: {
        id: string
        files: SubmissionFile[]
        response_text: string | null
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
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    async function handleDownload(fileId: string) {
        const url = await getSubmissionFileDownloadUrl(fileId)
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
            {error && <p className="text-caption text-error">{error}</p>}
            {rows.map((row) => (
                <div
                    key={row.studentId}
                    className="bg-surface rounded-md shadow-card p-4"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-body-emphasis text-ink">{row.studentName}</p>
                            {row.submission ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {row.submission.files.length > 0 ? (
                                        row.submission.files.map((f) => (
                                            <button
                                                key={f.id}
                                                onClick={() => handleDownload(f.id)}
                                                className="text-caption text-brand underline hover:text-brand-hover"
                                            >
                                                {f.file_name}
                                            </button>
                                        ))
                                    ) : (
                                        <span className="text-caption text-text-secondary">No files attached</span>
                                    )}
                                    {row.submission.response_text && (
                                        <button
                                            onClick={() =>
                                                setExpandedId((prev) => (prev === row.submission!.id ? null : row.submission!.id))
                                            }
                                            className="text-caption text-text-secondary underline hover:text-ink"
                                        >
                                            {expandedId === row.submission.id ? 'Hide note' : 'View note'}
                                        </button>
                                    )}
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
                            <div className="flex items-center gap-3 shrink-0">
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
                                            className="h-9 px-4 rounded-md border-[1.5px] border-hairline-strong text-caption font-semibold text-ink hover:bg-surface-sunken"
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

                    {row.submission && expandedId === row.submission.id && row.submission.response_text && (
                        <div className="mt-3 pt-3 border-t border-hairline">
                            <p className="text-caption text-text-secondary mb-1">Submitted note</p>
                            <p className="text-body-md text-ink whitespace-pre-wrap">{row.submission.response_text}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
