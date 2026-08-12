'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAssignment } from '@/features/assignments/actions/assignments'

let linkRowKeySeed = 0
function nextLinkRowKey() {
    linkRowKeySeed += 1
    return `link-${linkRowKeySeed}`
}

const MAX_FILE_MB = 40

function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function NewAssignmentForm({ courseId }: { courseId: string }) {
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [dueDate, setDueDate] = useState('')
    const [dueTime, setDueTime] = useState('')
    const [linkRows, setLinkRows] = useState<{ key: string; url: string; label: string }[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const router = useRouter()

    function handleFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
        const chosen = Array.from(e.target.files ?? [])
        setSelectedFiles((prev) => {
            const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`))
            const merged = [...prev, ...chosen.filter((f) => !existingKeys.has(`${f.name}-${f.size}`))]
            syncInputFiles(merged)
            return merged
        })
    }

    function removeFile(index: number) {
        setSelectedFiles((prev) => {
            const next = prev.filter((_, i) => i !== index)
            syncInputFiles(next)
            return next
        })
    }

    // Keeps the actual <input type="file"> in sync with the chip list so
    // the right files still get submitted with the form.
    function syncInputFiles(files: File[]) {
        const dataTransfer = new DataTransfer()
        files.forEach((f) => dataTransfer.items.add(f))
        if (fileInputRef.current) {
            fileInputRef.current.files = dataTransfer.files
        }
    }

    function addLinkRow() {
        setLinkRows((prev) => [...prev, { key: nextLinkRowKey(), url: '', label: '' }])
    }

    function updateLinkRow(key: string, field: 'url' | 'label', value: string) {
        setLinkRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)))
    }

    function removeLinkRow(key: string) {
        setLinkRows((prev) => prev.filter((row) => row.key !== key))
    }

    function handleSubmit(formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await createAssignment(courseId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.push(`/teacher/courses/${courseId}`)
            router.refresh()
        })
    }

    return (
        // max-w-2xl is the shared single-form-card width, DESIGN-LMS.md §7.8.
        <form action={handleSubmit} className="max-w-2xl grid gap-4 bg-surface rounded-md shadow-card p-8">
            {error && <p className="text-caption text-error">{error}</p>}
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
            <div className="pt-2 border-t border-hairline space-y-6">
                <div>
                    <label className="block text-label text-ink-soft mb-1">Attachments (optional)</label>

                    {/* Hidden input holds the real FileList submitted with the form;
                        the button below just opens the OS file picker. */}
                    <input
                        ref={fileInputRef}
                        id="files"
                        name="files"
                        type="file"
                        multiple
                        onChange={handleFilesChosen}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 h-11 px-4 rounded-md border-[1.5px] border-dashed border-hairline-strong
                                   text-body-md text-ink font-medium hover:border-brand hover:bg-surface-sunken
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                            <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Attach files
                    </button>

                    <p className="mt-2 text-caption text-text-secondary">
                        PDF, DOC/DOCX, JPEG/PNG, MP3, or MP4 — max {MAX_FILE_MB} MB each
                    </p>

                    {selectedFiles.length > 0 && (
                        <ul className="mt-3 space-y-2">
                            {selectedFiles.map((file, index) => {
                                const tooLarge = file.size > MAX_FILE_MB * 1024 * 1024
                                return (
                                    <li
                                        key={`${file.name}-${file.size}-${index}`}
                                        className={`flex items-center gap-3 h-11 px-3 rounded-md border-[1.5px] bg-surface-sunken
                                                    ${tooLarge ? 'border-error' : 'border-hairline-strong'}`}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-text-secondary">
                                            <path
                                                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                            />
                                            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" />
                                        </svg>

                                        <span className="text-caption text-ink truncate flex-1" title={file.name}>
                                            {file.name}
                                        </span>

                                        <span
                                            className={`text-caption whitespace-nowrap ${
                                                tooLarge ? 'text-error font-medium' : 'text-text-secondary'
                                            }`}
                                        >
                                            {tooLarge ? `Too large (${formatFileSize(file.size)})` : formatFileSize(file.size)}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            aria-label={`Remove ${file.name}`}
                                            className="text-text-secondary hover:text-error shrink-0"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-label text-ink-soft">Links (optional)</label>
                        <button
                            type="button"
                            onClick={addLinkRow}
                            className="text-caption font-semibold text-brand hover:text-brand-hover"
                        >
                            + Add a link
                        </button>
                    </div>
                    {linkRows.length === 0 ? (
                        <p className="text-caption text-text-secondary">
                            No links added yet.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {linkRows.map((row) => (
                                <div key={row.key} className="flex items-center gap-2">
                                    <input
                                        type="url"
                                        name="linkUrl"
                                        placeholder="https://..."
                                        value={row.url}
                                        onChange={(e) => updateLinkRow(row.key, 'url', e.target.value)}
                                        className="flex-1 h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                    <input
                                        type="text"
                                        name="linkLabel"
                                        placeholder="Label (optional)"
                                        value={row.label}
                                        onChange={(e) => updateLinkRow(row.key, 'label', e.target.value)}
                                        className="w-40 h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Remove link"
                                        onClick={() => removeLinkRow(row.key)}
                                        className="text-text-secondary hover:text-error text-body-md px-2"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div>
                <label className="block text-label text-ink-soft">Due date (optional)</label>
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
                {/*
                    BUG FIX (2026-08-03): previously this hidden input sent
                    a naive "YYYY-MM-DDTHH:mm" string straight through, with
                    no timezone marker at all. due_at is a `timestamptz`
                    column, so Postgres interpreted those digits using its
                    own session timezone (UTC on Supabase), not the
                    teacher's actual local time (Manila, UTC+8) — an "Aug 2,
                    11:59 PM" due date silently became "Aug 3, 7:59 AM" once
                    stored, letting students submit 8 hours past when the
                    teacher actually meant to cut them off.

                    Fix: `new Date("YYYY-MM-DDTHH:mm")` (no trailing "Z" or
                    offset) is parsed by the JS engine as LOCAL time — i.e.
                    the browser's own timezone, which for this school is
                    the only timezone that matters. Calling .toISOString()
                    on that then converts it to a real, unambiguous UTC
                    instant before it ever leaves the browser, so the server
                    and database no longer have to guess what timezone the
                    naive digits were supposed to mean.
                */}
                <input
                    type="hidden"
                    name="dueAt"
                    value={dueDate ? new Date(`${dueDate}T${dueTime || '23:59'}`).toISOString() : ''}
                />
            </div>
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

            <div className="flex items-center gap-3">
                <input
                    id="allowLate"
                    name="allowLate"
                    type="checkbox"
                    className="h-5 w-5 rounded border-[1.5px] border-hairline-strong text-brand focus:ring-2 focus:ring-brand/30"
                />
                <label htmlFor="allowLate" className="text-body-md text-ink">
                    Allow submissions after the due date
                </label>
            </div>
            <p className="-mt-3 text-caption text-text-secondary">
                If off, students can no longer submit or edit their
                submission once the due date passes.
            </p>

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