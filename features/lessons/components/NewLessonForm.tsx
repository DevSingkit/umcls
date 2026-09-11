'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { Plus, FileText, X, Play, Link2 } from 'lucide-react'
import { createLesson, type CreateLessonResult } from '@/features/lessons/actions/lessons'
import { extractYoutubeVideoId, toYoutubeEmbedUrl } from '@/lib/utils/youtube'

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
    type LinkRow = { id: number; url: string }
    const [links, setLinks] = useState<LinkRow[]>([{ id: 0, url: '' }])

    function addLinkRow() {
        setLinks((rows) => [...rows, { id: rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 0, url: '' }])
    }

    function removeLinkRow(id: number) {
        setLinks((rows) => rows.filter((r) => r.id !== id))
    }

    function updateLinkUrl(id: number, url: string) {
        setLinks((rows) => rows.map((r) => (r.id === id ? { ...r, url } : r)))
    }

    function deriveLinkLabel(url: string): string {
        if (extractYoutubeVideoId(url)) return 'YouTube video'
        try {
            return new URL(url).hostname.replace(/^www\./, '')
        } catch {
            return ''
        }
    }

    const [viewingYoutubeId, setViewingYoutubeId] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
    const [viewingFile, setViewingFile] = useState<{ url: string; type: string; name: string; isTemp: boolean } | null>(
        null
    )

    // Lesson content grows with its content instead of scrolling
    // internally — same treatment as NewAssignmentForm's Instructions
    // field.
    const contentRef = useRef<HTMLTextAreaElement>(null)
    function resizeContent() {
        const el = contentRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
    }

    function openPreview(file: File) {
        const key = fileKey(file)
        const cached = previewUrls[key]
        if (cached) {
            setViewingFile({ url: cached, type: file.type, name: file.name, isTemp: false })
            return
        }
        const url = URL.createObjectURL(file)
        setViewingFile({ url, type: file.type, name: file.name, isTemp: true })
    }

    function closePreview() {
        setViewingFile((current) => {
            if (current?.isTemp) URL.revokeObjectURL(current.url)
            return null
        })
    }

    useEffect(() => {
        if (!viewingFile) return
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') closePreview()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewingFile])

    function fileKey(file: File) {
        return `${file.name}-${file.size}`
    }

    useEffect(() => {
        return () => {
            Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function handleFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
        const chosen = Array.from(e.target.files ?? [])
        const existingKeys = new Set(selectedFiles.map((f) => fileKey(f)))
        const newFiles = chosen.filter((f) => !existingKeys.has(fileKey(f)))
        if (newFiles.length === 0) return

        const merged = [...selectedFiles, ...newFiles]
        syncInputFiles(merged)
        setSelectedFiles(merged)

        const newPreviews: Record<string, string> = {}
        newFiles.forEach((f) => {
            if (f.type.startsWith('image/')) {
                newPreviews[fileKey(f)] = URL.createObjectURL(f)
            }
        })
        if (Object.keys(newPreviews).length > 0) {
            setPreviewUrls((prevUrls) => ({ ...prevUrls, ...newPreviews }))
        }
    }

    function removeFile(index: number) {
        const removed = selectedFiles[index]
        const next = selectedFiles.filter((_, i) => i !== index)
        syncInputFiles(next)
        setSelectedFiles(next)

        if (removed) {
            const key = fileKey(removed)
            setPreviewUrls((prevUrls) => {
                if (!(key in prevUrls)) return prevUrls
                URL.revokeObjectURL(prevUrls[key]!)
                const { [key]: _removed, ...rest } = prevUrls
                return rest
            })
        }
    }

    function syncInputFiles(files: File[]) {
        const dataTransfer = new DataTransfer()
        files.forEach((f) => dataTransfer.items.add(f))
        if (fileInputRef.current) {
            fileInputRef.current.files = dataTransfer.files
        }
    }

    return (
        <div className="max-w-2xl pb-16">
            <h1 className="text-h1 text-ink mb-6">
                Create a new lesson
            </h1>
            <form action={formAction} className="bg-surface rounded-md shadow-card px-8 pb-8 pt-5">
                <input type="hidden" name="courseId" value={courseId} />

                <div className="space-y-8">
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
                        className="w-full min-h-[44px] px-4 rounded-md border-2 border-hairline text-body-md text-ink
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
                        ref={contentRef}
                        rows={10}
                        required
                        placeholder="Write the lesson here"
                        onInput={resizeContent}
                        className="w-full px-4 py-3 rounded-md border-2 border-hairline text-body-md text-ink leading-relaxed
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none overflow-hidden"
                    />
                </div>

                <div>
                    <label className="block text-label text-ink mb-2">
                        Files (optional)
                    </label>

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

                    {/* DESIGN-LMS 2.1: h-11 -> h-12 (48px secondary touch
                        target floor); custom plus SVG -> lucide Plus. */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 h-12 px-4 rounded-md border-2 border-dashed border-hairline
                                   text-body-md text-ink font-medium hover:border-brand hover:bg-surface-sunken
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
                    >
                        <Plus size={18} className="shrink-0" aria-hidden="true" />
                        Attach files
                    </button>

                    <p className="text-caption text-text-secondary mt-2">
                        PDF, DOC/DOCX, JPEG/PNG, MP3, MP4 — max {MAX_FILE_MB} MB each. Select multiple files at once if needed.
                    </p>

                    {selectedFiles.length > 0 && (
                        <ul className="mt-3 space-y-2">
                            {selectedFiles.map((file, index) => {
                                const tooLarge = file.size > MAX_FILE_MB * 1024 * 1024
                                const previewUrl = previewUrls[fileKey(file)]

                                return (
                                    <li
                                        key={`${file.name}-${file.size}-${index}`}
                                        className={`flex items-center gap-3 h-11 px-3 rounded-md border bg-surface shadow-card
                                                    ${tooLarge ? 'border-error' : 'border-hairline'}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => openPreview(file)}
                                            className="flex items-center gap-3 flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm"
                                            title={`View ${file.name}`}
                                        >
                                            {previewUrl ? (
                                                /* eslint-disable-next-line @next/next/no-img-element -- local blob: object URL for an in-memory File not yet uploaded, next/image can't optimize that */
                                                <img
                                                    src={previewUrl}
                                                    alt=""
                                                    className="shrink-0 h-8 w-8 rounded-sm object-cover"
                                                />
                                            ) : (
                                                <FileText size={16} className="shrink-0 text-text-secondary" aria-hidden="true" />
                                            )}

                                            <span className="text-caption text-ink truncate flex-1 hover:underline" title={file.name}>
                                                {file.name}
                                            </span>
                                        </button>

                                        <span
                                            className={`text-caption whitespace-nowrap ${
                                                tooLarge ? 'text-error font-medium' : 'text-text-secondary'
                                            }`}
                                        >
                                            {tooLarge ? `Too large (${formatFileSize(file.size)})` : formatFileSize(file.size)}
                                        </span>

                                        {/* Matches MaterialList's Remove button (used on
                                            the edit-lesson page) for visual consistency —
                                            a labeled "Remove" action instead of a bare X
                                            icon. */}
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="shrink-0 text-caption font-medium text-error hover:underline"
                                        >
                                            Remove
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
                        {links.map((link) => {
                            const videoId = extractYoutubeVideoId(link.url)
                            const label = deriveLinkLabel(link.url)

                            return (
                                <div key={link.id} className="space-y-2">
                                    <div className="flex gap-3 flex-wrap items-center">
                                        <input
                                            type="url"
                                            value={link.url}
                                            onChange={(e) => updateLinkUrl(link.id, e.target.value)}
                                            placeholder="https://..."
                                            className="h-11 px-4 rounded-md border-2 border-hairline text-body-md text-ink flex-1 min-w-[200px]
                                                       focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                        />
                                        <input type="hidden" name="linkLabel" value={label} />
                                        <input type="hidden" name="linkUrl" value={link.url} />
                                        {/* Matches MaterialList's Remove button for
                                            visual consistency across create/edit. */}
                                        <button
                                            type="button"
                                            onClick={() => removeLinkRow(link.id)}
                                            className="shrink-0 text-caption font-medium text-error hover:underline"
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    {link.url && (
                                        videoId ? (
                                            <button
                                                type="button"
                                                onClick={() => setViewingYoutubeId(videoId)}
                                                className="flex items-center gap-3 h-11 px-3 rounded-md border border-hairline bg-surface shadow-card w-full text-left hover:border-brand hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
                                            >
                                                <span className="relative shrink-0 h-8 w-11 rounded-sm overflow-hidden bg-surface">
                                                    {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail URL, plain <img> is simplest, no next/image domain config needed */}
                                                    <img
                                                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <span className="absolute inset-0 flex items-center justify-center bg-ink/30">
                                                        <Play size={12} fill="currentColor" className="text-on-ink" aria-hidden="true" />
                                                    </span>
                                                </span>
                                                <span className="text-caption text-ink truncate flex-1 hover:underline">
                                                    YouTube video
                                                </span>
                                            </button>
                                        ) : (
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 h-11 px-3 rounded-md border border-hairline bg-surface shadow-card hover:border-brand hover:shadow-card-hover transition-colors"
                                            >
                                                <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-sm bg-surface-sunken text-text-secondary">
                                                    <Link2 size={16} aria-hidden="true" />
                                                </span>
                                                <span className="text-caption text-ink truncate flex-1 hover:underline">
                                                    {label || link.url}
                                                </span>
                                            </a>
                                        )
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    {/* DESIGN-LMS 2.1: was a bare text link with no defined
                        touch target. Converted to a real secondary button
                        (h-12/48px) with lucide Plus, matching "Attach
                        files" above. */}
                    <button
                        type="button"
                        onClick={addLinkRow}
                        className="mt-3 flex items-center gap-2 h-12 px-4 rounded-md text-caption text-brand font-semibold hover:bg-surface-sunken transition-colors"
                    >
                        <Plus size={16} aria-hidden="true" />
                        Add another link
                    </button>
                </div>

                {!state.ok && state.error && (
                    <p className="text-caption text-error" role="alert">
                        {state.error}
                    </p>
                )}

                {/* DESIGN-LMS 2.1: h-11 -> h-14 (56px primary CTA floor). */}
                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-14 rounded-md bg-brand text-on-ink font-semibold text-body-md
                               hover:bg-brand-hover disabled:opacity-60 transition-colors"
                >
                    {isPending ? 'Creating lesson…' : 'Create lesson'}
                </button>
                </div>
            </form>

            {viewingYoutubeId && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="YouTube video preview"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
                    onClick={() => setViewingYoutubeId(null)}
                >
                    <button
                        type="button"
                        onClick={() => setViewingYoutubeId(null)}
                        aria-label="Close preview"
                        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-pill bg-surface text-ink shadow-card hover:bg-surface-sunken"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                    <div
                        className="w-full max-w-3xl aspect-video rounded-md overflow-hidden shadow-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <iframe
                            src={toYoutubeEmbedUrl(viewingYoutubeId)}
                            title="YouTube video preview"
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}

            {viewingFile && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Preview of ${viewingFile.name}`}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
                    onClick={closePreview}
                >
                    <button
                        type="button"
                        onClick={closePreview}
                        aria-label="Close preview"
                        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-pill bg-surface text-ink shadow-card hover:bg-surface-sunken"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>

                    {viewingFile.type.startsWith('image/') && (
                        /* eslint-disable-next-line @next/next/no-img-element -- local blob URL, plain <img> is simplest */
                        <img
                            src={viewingFile.url}
                            alt=""
                            onClick={(e) => e.stopPropagation()}
                            className="max-h-[85vh] max-w-[90vw] w-auto h-auto rounded-md object-contain shadow-modal"
                        />
                    )}

                    {viewingFile.type.startsWith('video/') && (
                        <video
                            src={viewingFile.url}
                            controls
                            onClick={(e) => e.stopPropagation()}
                            className="max-h-[85vh] max-w-[90vw] w-auto rounded-md shadow-modal"
                        />
                    )}

                    {viewingFile.type.startsWith('audio/') && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg rounded-md bg-surface p-6 shadow-modal"
                        >
                            <p className="text-body-emphasis text-ink truncate mb-3" title={viewingFile.name}>
                                {viewingFile.name}
                            </p>
                            <audio src={viewingFile.url} controls className="w-full" />
                        </div>
                    )}

                    {viewingFile.type === 'application/pdf' && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-3xl h-[85vh] rounded-md overflow-hidden shadow-modal"
                        >
                            <iframe src={viewingFile.url} title={viewingFile.name} className="h-full w-full" />
                        </div>
                    )}

                    {!viewingFile.type.startsWith('image/') &&
                        !viewingFile.type.startsWith('video/') &&
                        !viewingFile.type.startsWith('audio/') &&
                        viewingFile.type !== 'application/pdf' && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-md rounded-md bg-surface p-8 shadow-modal flex flex-col items-center gap-3 text-center"
                            >
                                <p className="text-body-emphasis text-ink truncate w-full" title={viewingFile.name}>
                                    {viewingFile.name}
                                </p>
                                <p className="text-body-md text-text-secondary">
                                    This file type can&apos;t be previewed here.
                                </p>
                                <a
                                    href={viewingFile.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-body-md text-brand font-semibold hover:underline"
                                >
                                    Open in a new tab instead
                                </a>
                            </div>
                        )}
                </div>
            )}
        </div>
    )
}