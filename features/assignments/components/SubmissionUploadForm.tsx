'use client'
// Rewritten for multiple files per submission (migration 085,
// submissions.ts) — matches real Google Classroom: attach several
// files via one multi-select picker, remove any newly-picked file
// before submitting, remove any already-attached file afterward
// (independently of resubmitting, via removeSubmissionFile).
//
// Still supports the `compact` prop added for the Model B side panel
// (DESIGN-LMS.md §8.10) — no change to that behavior.
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitAssignment, unsubmitAssignment, removeSubmissionFile } from '@/features/assignments/actions/submissions'

const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4'
const MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024

type SubmissionFile = { id: string; file_name: string; uploaded_at: string }

type Submission = {
    files: SubmissionFile[]
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
    compact = false,
}: {
    assignmentId: string
    maxScore: number
    existing: Submission
    dueAt: string | null
    allowLate: boolean
    compact?: boolean
}) {
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isUnsubmitting, startUnsubmitting] = useTransition()
    const [removingFileId, setRemovingFileId] = useState<string | null>(null)
    const [isRemovingFile, startRemovingFile] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    // Locally-selected files, not yet uploaded — a student can remove
    // one before ever hitting Submit, same as real Classroom lets you
    // un-pick an attachment before turning work in.
    const [pendingFiles, setPendingFiles] = useState<File[]>([])

    const isPastDue = dueAt ? new Date(dueAt).getTime() < Date.now() : false
    const isLocked = isPastDue && !allowLate
    const canEdit = !isLocked && existing?.status !== 'graded' && existing?.status !== 'returned'

    const cardPadding = compact ? 'p-4' : 'p-6'
    const textareaRows = compact ? 2 : 3

    function handleFilesPicked(fileList: FileList | null) {
        if (!fileList) return
        setPendingFiles((prev) => [...prev, ...Array.from(fileList)])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    function removePendingFile(index: number) {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index))
    }

    function handleRemoveExistingFile(fileId: string) {
        const proceed = window.confirm('Remove this file from your submission?')
        if (!proceed) return
        setError(null)
        setRemovingFileId(fileId)
        startRemovingFile(async () => {
            const result = await removeSubmissionFile(fileId)
            if (!result.ok) {
                setError(result.error)
                setRemovingFileId(null)
                return
            }
            router.refresh()
        })
    }

    function handleSubmit(formData: FormData) {
        setError(null)

        for (const file of pendingFiles) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                setError(`"${file.name}" is too large. Max size is 40 MB per file.`)
                return
            }
        }

        const note = formData.get('note')
        const hasFiles = pendingFiles.length > 0
        const hasExistingFiles = (existing?.files.length ?? 0) > 0
        const hasNote = typeof note === 'string' && note.trim().length > 0

        if (!hasFiles && !hasExistingFiles && !hasNote) {
            const proceed = window.confirm(
                "You haven't attached a file or written a note. Submit anyway?"
            )
            if (!proceed) return
        }

        // Rebuild formData with every pending file under the same
        // repeated 'files' key submitAssignment reads via getAll.
        for (const file of pendingFiles) {
            formData.append('files', file)
        }

        startTransition(async () => {
            const result = await submitAssignment(assignmentId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            formRef.current?.reset()
            setPendingFiles([])
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
                <div className={`bg-surface rounded-md shadow-card ${cardPadding}`}>
                    {existing.files.length > 0 && (
                        <div className="grid gap-2 mb-2">
                            {existing.files.map((f) => (
                                <div key={f.id} className="flex items-center justify-between gap-3">
                                    <span className="text-body-emphasis text-ink truncate">{f.file_name}</span>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExistingFile(f.id)}
                                            disabled={isRemovingFile && removingFileId === f.id}
                                            className="shrink-0 text-caption font-medium text-error hover:underline disabled:opacity-60"
                                        >
                                            {isRemovingFile && removingFileId === f.id ? 'Removing…' : 'Remove'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
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
                    {canEdit && !!existing && (
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
                        The due date has passed and late submissions aren&apos;t allowed for this
                        assignment.
                        {existing ? ' Your submission above is final.' : ' You can no longer submit.'}
                    </p>
                </div>
            ) : (
                <form ref={formRef} action={handleSubmit} className="grid gap-3">
                    <textarea
                        name="note"
                        rows={textareaRows}
                        defaultValue={existing?.response_text ?? ''}
                        placeholder="Add a note (optional)"
                        className="w-full px-4 py-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink leading-relaxed
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />

                    {pendingFiles.length > 0 && (
                        <div className="grid gap-1">
                            {pendingFiles.map((file, i) => (
                                <div key={`${file.name}-${i}`} className="flex items-center justify-between gap-3">
                                    <span className="text-caption text-ink truncate">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removePendingFile(i)}
                                        className="shrink-0 text-caption font-medium text-error hover:underline"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={`flex items-center gap-3 flex-wrap ${compact ? 'flex-col items-stretch' : ''}`}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={ACCEPT}
                            onChange={(e) => handleFilesPicked(e.target.files)}
                            className="text-caption text-text-secondary"
                        />
                        <button
                            type="submit"
                            disabled={isPending}
                            className={`h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60 ${
                                compact ? 'w-full' : ''
                            }`}
                        >
                            {isPending ? 'Submitting…' : existing ? 'Resubmit' : 'Submit'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
