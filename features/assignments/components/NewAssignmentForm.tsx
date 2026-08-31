'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createAssignment } from '@/features/assignments/actions/assignments'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

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
    const [dueAt, setDueAt] = useState('')
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
                    className="mt-1 h-11 w-full px-4 rounded-md border-2 border-hairline text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
            </div>
            <div>
                <label htmlFor="instructions" className="text-label text-ink-soft">Instructions</label>
                <textarea
                    id="instructions"
                    name="instructions"
                    rows={4}
                    className="mt-1 w-full px-4 py-3 rounded-md border-2 border-hairline text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
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
                        className="flex items-center gap-2 h-12 px-4 rounded-md border-2 border-dashed border-hairline
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
                                        className={`flex items-center gap-3 h-11 px-3 rounded-md border-2 bg-surface-sunken
                                                    ${tooLarge ? 'border-error' : 'border-hairline'}`}
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
                                        className="flex-1 h-11 px-4 rounded-md border-2 border-hairline text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                    <input
                                        type="text"
                                        name="linkLabel"
                                        placeholder="Label (optional)"
                                        value={row.label}
                                        onChange={(e) => updateLinkRow(row.key, 'label', e.target.value)}
                                        className="w-40 h-11 px-4 rounded-md border-2 border-hairline text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Remove link"
                                        onClick={() => removeLinkRow(row.key)}
                                        className="flex h-9 w-9 items-center justify-center text-text-secondary hover:text-error"
                                    >
                                        <X size={16} aria-hidden="true" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div>
                <label className="block text-label text-ink-soft mb-2">Due date (optional)</label>
                <div className="flex items-center gap-3 flex-wrap">
                    <DateTimePicker value={dueAt} onChange={setDueAt} placeholder="No due date" />
                    <button
                        type="button"
                        onClick={() => setDueAt('')}
                        disabled={!dueAt}
                        className="text-caption font-medium text-text-secondary hover:text-error disabled:opacity-40"
                    >
                        Clear
                    </button>
                </div>
                {/*
                    BUG FIX (2026-08-03), still applies: due_at is a
                    `timestamptz` column, so a naive "YYYY-MM-DDTHH:mm"
                    string sent as-is would be interpreted using the
                    database's session timezone (UTC), not the
                    teacher's actual local time. `new Date(dueAt)` (no
                    trailing "Z"/offset) is parsed as LOCAL time by the
                    JS engine, so .toISOString() here produces a real,
                    unambiguous UTC instant before it ever leaves the
                    browser. DateTimePicker's value is already in this
                    same naive format, so this conversion is unchanged
                    from before — only how dueAt gets built changed
                    (clicking a calendar instead of typing two fields).
                */}
                <input type="hidden" name="dueAt" value={dueAt ? new Date(dueAt).toISOString() : ''} />
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
                    className="mt-1 h-11 w-full px-4 rounded-md border-2 border-hairline text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
            </div>

            <div className="flex items-center gap-3">
                <input
                    id="allowLate"
                    name="allowLate"
                    type="checkbox"
                    className="h-5 w-5 rounded border-2 border-hairline text-brand focus:ring-2 focus:ring-brand/30"
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
                className="w-full h-12 rounded-md bg-brand text-on-ink font-semibold text-body-md hover:bg-brand-hover disabled:opacity-60 transition-colors"
            >
                {isPending ? 'Creating…' : 'Create assignment'}
            </button>
        </form>
    )
}
