'use client'
import { useActionState, useRef, useState } from 'react'
import { createLesson, type CreateLessonResult } from '@/features/lessons/actions/lessons'

const MAX_FILE_MB = 40

function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const initialState: CreateLessonResult = { ok: false, error: '' }

async function createLessonAction(_prevState: CreateLessonResult, formData: FormData) {
    return createLesson(formData)
}

export function NewLessonForm({ courseId }: { courseId: string }) {
    const [state, formAction, isPending] = useActionState(createLessonAction, initialState)
    // One row to start; teacher can add more. Each row just needs a
    // unique key for React — the actual values live in the DOM inputs
    // and are read via formData.getAll on submit.
    const [linkRowIds, setLinkRowIds] = useState<number[]>([0])

    // Files live in the hidden input's FileList (the actual source of
    // truth submitted with the form). We mirror them into state just to
    // render the "chip list" UI, and rebuild the input's FileList via
    // DataTransfer whenever a file is removed.
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])

    function handleFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
        const chosen = Array.from(e.target.files ?? [])
        setSelectedFiles((prev) => {
            // Avoid duplicate name+size entries when picking files across
            // multiple browse actions.
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

    // Keeps the actual <input type="file"> in sync with our chip list so
    // the right files still get submitted with the form.
    function syncInputFiles(files: File[]) {
        const dataTransfer = new DataTransfer()
        files.forEach((f) => dataTransfer.items.add(f))
        if (fileInputRef.current) {
            fileInputRef.current.files = dataTransfer.files
        }
    }

    function addLinkRow() {
        setLinkRowIds((rows) => [...rows, rows.length ? Math.max(...rows) + 1 : 0])
    }

    function removeLinkRow(id: number) {
        setLinkRowIds((rows) => rows.filter((r) => r !== id))
    }

    return (
        // max-w-2xl is the shared single-form-card width, DESIGN-LMS.md §7.8.
        <div className="max-w-2xl mx-auto pb-16">
            <h1 className="font-heading text-h1 text-ink mb-2">
                Create a new lesson
            </h1>
            <p className="text-body-md text-text-secondary mb-8">
                Fill in the lesson and attach any files or links now — everything is saved together
                in one step. Materials can&apos;t be added later, so add everything you need here.
            </p>

            <form action={formAction} className="bg-surface rounded-md shadow-card p-8 space-y-8">
                <input type="hidden" name="courseId" value={courseId} />

                <div>
                    <label htmlFor="title" className="block text-label text-ink mb-2">
                        Lesson title
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        placeholder="e.g. Cell structure"
                        className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="content" className="block text-label text-ink mb-2">
                        Lesson content
                    </label>
                    <textarea
                        id="content"
                        name="content"
                        rows={10}
                        required
                        placeholder="Write the lesson here"
                        className="w-full px-4 py-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink leading-relaxed
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label className="block text-label text-ink mb-2">
                        Files (optional)
                    </label>

                    {/* Hidden input holds the real FileList submitted with the form;
                        the button below just opens the OS file picker. */}
                    <input
                        ref={fileInputRef}
                        id="files"
                        name="files"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4"
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
                            <path
                                d="M12 4v16m-8-8h16"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                        Attach files
                    </button>

                    <p className="text-caption text-text-secondary mt-2">
                        PDF, DOC/DOCX, JPEG/PNG, MP3, MP4 — max {MAX_FILE_MB} MB each. Select multiple files at once if needed.
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
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            className="shrink-0 text-text-secondary"
                                        >
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
                                                <path
                                                    d="M6 6l12 12M18 6L6 18"
                                                    stroke="currentColor"
                                                    strokeWidth="1.75"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                <div>
                    <label className="block text-label text-ink mb-2">
                        Links (optional)
                    </label>
                    <p className="text-caption text-text-secondary mb-3">
                        YouTube, Google Drive, or any other link.
                    </p>
                    <div className="space-y-3">
                        {linkRowIds.map((id) => (
                            <div key={id} className="flex gap-3 flex-wrap items-center">
                                <input
                                    type="text"
                                    name="linkLabel"
                                    placeholder="Label (optional)"
                                    className="h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                               focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                                <input
                                    type="url"
                                    name="linkUrl"
                                    placeholder="https://..."
                                    className="h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink flex-1 min-w-[200px]
                                               focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                                {linkRowIds.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeLinkRow(id)}
                                        className="text-caption text-error font-medium hover:underline"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addLinkRow}
                        className="mt-3 text-caption text-brand font-semibold hover:underline"
                    >
                        + Add another link
                    </button>
                </div>

                {!state.ok && state.error && (
                    <p className="text-caption text-error" role="alert">
                        {state.error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-md bg-brand text-on-ink font-semibold text-body-md
                               hover:bg-brand-hover disabled:opacity-60 transition-colors"
                >
                    {isPending ? 'Creating lesson…' : 'Create lesson'}
                </button>
            </form>
        </div>
    )
}
