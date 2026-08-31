'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
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
    // Links are now controlled (url tracked in state, not just an
    // uncontrolled DOM input) so a live thumbnail/icon preview can be
    // computed from whatever's typed. Label is no longer a field the
    // teacher fills in by hand — it's derived from the URL (YouTube →
    // "YouTube video", anything else → the hostname) and still
    // submitted via a hidden input under the same `linkLabel` field
    // name, so createLesson's expected form-data shape is unchanged.
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

    // Separate from viewingFile (the local attached-file modal) since
    // this previews an external YouTube URL, not a blob: object URL.
    const [viewingYoutubeId, setViewingYoutubeId] = useState<string | null>(null)

    // Files live in the hidden input's FileList (the actual source of
    // truth submitted with the form). We mirror them into state just to
    // render the "chip list" UI, and rebuild the input's FileList via
    // DataTransfer whenever a file is removed.
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])

    // Object URLs for image files only — instant local previews with no
    // backend/upload involved, since these are still just File objects
    // sitting in browser memory before the form submits. Keyed the same
    // way selectedFiles dedupes (name+size), so it stays in sync as
    // files are added/removed.
    const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

    // The file currently shown in the in-page preview modal. `isTemp`
    // tracks whether this URL was minted just for the modal (non-image
    // files, no cached preview) so it gets revoked on close rather than
    // living until unmount like the cached image previews do.
    const [viewingFile, setViewingFile] = useState<{ url: string; type: string; name: string; isTemp: boolean } | null>(
        null
    )

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

    // Close on Escape while the modal is open.
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

    // Revoke every remaining object URL when the form unmounts, so a
    // teacher who attaches several images and then navigates away
    // doesn't leak that memory for the rest of the session.
    useEffect(() => {
        return () => {
            Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function handleFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
        const chosen = Array.from(e.target.files ?? [])
        // Avoid duplicate name+size entries when picking files across
        // multiple browse actions. Read selectedFiles directly (not via
        // a functional update) specifically so the object-URL creation
        // below stays a plain side effect in the event handler, not
        // inside a state updater — React 18 Strict Mode double-invokes
        // updater functions in development to catch exactly this kind
        // of impurity, which was silently minting two throwaway blob
        // URLs per image and could leave the visible one already
        // revoked/stale.
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

    // Keeps the actual <input type="file"> in sync with our chip list so
    // the right files still get submitted with the form.
    function syncInputFiles(files: File[]) {
        const dataTransfer = new DataTransfer()
        files.forEach((f) => dataTransfer.items.add(f))
        if (fileInputRef.current) {
            fileInputRef.current.files = dataTransfer.files
        }
    }



    return (
        // max-w-2xl is the shared single-form-card width, DESIGN-LMS.md §7.8.
        // No mx-auto — every other form in the app (NewQuizForm,
        // CreateUserForm, EnrollForm, CourseReassignment) sits left-
        // aligned within the page container, not centered.
        <div className="max-w-2xl pb-16">
            <h1 className="text-h1 text-ink mb-6">
                Create a new lesson
            </h1>
            <form action={formAction} className="bg-surface rounded-md shadow-card px-8 pb-8 pt-5">
                {/* Moved out of the space-y-8 flow below on purpose —
                    a hidden input still counts as a sibling for
                    space-y's margin calculation even though it renders
                    with zero height, which was silently adding an
                    extra 32px gap above "Lesson title" on top of the
                    card's own top padding. */}
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
                        rows={10}
                        required
                        placeholder="Write the lesson here"
                        className="w-full px-4 py-3 rounded-md border-2 border-hairline text-body-md text-ink leading-relaxed
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
                        className="flex items-center gap-2 h-11 px-4 rounded-md border-2 border-dashed border-hairline
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
                                const previewUrl = previewUrls[fileKey(file)]

                                return (
                                    <li
                                        key={`${file.name}-${file.size}-${index}`}
                                        className={`flex items-center gap-3 h-11 px-3 rounded-md border-2 bg-surface-sunken
                                                    ${tooLarge ? 'border-error' : 'border-hairline'}`}
                                    >
                                        {/* Clicking opens the file in a new tab via its local
                                            object URL — works before upload since nothing has
                                            been sent to the server yet, it's just reading the
                                            File object already in browser memory. A plain
                                            <button> wrapping icon+name (not the whole <li>) so
                                            the separate Remove button below doesn't end up
                                            nested inside another interactive element. */}
                                        <button
                                            type="button"
                                            onClick={() => openPreview(file)}
                                            className="flex items-center gap-3 flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm"
                                            title={`View ${file.name}`}
                                        >
                                            {previewUrl ? (
                                                <img
                                                    src={previewUrl}
                                                    alt=""
                                                    className="shrink-0 h-8 w-8 rounded-sm object-cover"
                                                />
                                            ) : (
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

                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            aria-label={`Remove ${file.name}`}
                                            className="relative text-text-secondary hover:text-error shrink-0 before:absolute before:-inset-2 before:content-['']"
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
                                        {/* Label is no longer typed by hand — derived from the
                                            URL and submitted through this hidden field so the
                                            createLesson action's expected form shape (paired
                                            linkLabel/linkUrl entries) doesn't need to change. */}
                                        <input type="hidden" name="linkLabel" value={label} />
                                        <input type="hidden" name="linkUrl" value={link.url} />
                                        <button
                                            type="button"
                                            onClick={() => removeLinkRow(link.id)}
                                            className="text-caption text-error font-medium hover:underline"
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    {link.url && (
                                        videoId ? (
                                            <button
                                                type="button"
                                                onClick={() => setViewingYoutubeId(videoId)}
                                                className="flex items-center gap-3 h-11 px-3 rounded-md border-2 border-hairline bg-surface-sunken w-full text-left hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
                                            >
                                                <span className="relative shrink-0 h-8 w-11 rounded-sm overflow-hidden bg-surface">
                                                    {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail URL, plain <img> is simplest */}
                                                    <img
                                                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <span className="absolute inset-0 flex items-center justify-center bg-ink/30">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-on-ink">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
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
                                                className="flex items-center gap-3 h-11 px-3 rounded-md border-2 border-hairline bg-surface-sunken hover:border-brand transition-colors"
                                            >
                                                <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-sm bg-surface text-text-secondary">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path
                                                            d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
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
                </div>
            </form>

            {viewingYoutubeId && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="YouTube video preview"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
                    onClick={() => setViewingYoutubeId(null)}
                >
                    <div
                        className="w-full max-w-3xl overflow-hidden rounded-md bg-surface shadow-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3">
                            <p className="text-body-emphasis text-ink">YouTube video</p>
                            <button
                                type="button"
                                onClick={() => setViewingYoutubeId(null)}
                                aria-label="Close preview"
                                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand before:absolute before:-inset-1 before:content-['']"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                        <div className="aspect-video">
                            <iframe
                                src={toYoutubeEmbedUrl(viewingYoutubeId)}
                                title="YouTube video preview"
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}

            {viewingFile && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Preview of ${viewingFile.name}`}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
                    onClick={closePreview}
                >
                    <div
                        className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-md bg-surface shadow-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3">
                            <p className="text-body-emphasis text-ink truncate" title={viewingFile.name}>
                                {viewingFile.name}
                            </p>
                            <button
                                type="button"
                                onClick={closePreview}
                                aria-label="Close preview"
                                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand before:absolute before:-inset-1 before:content-['']"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-5">
                            {viewingFile.type.startsWith('image/') && (
                                /* eslint-disable-next-line @next/next/no-img-element -- local blob URL, plain <img> is simplest */
                                <img
                                    src={viewingFile.url}
                                    alt=""
                                    className="max-h-[70vh] w-full rounded-md object-contain"
                                />
                            )}

                            {viewingFile.type.startsWith('video/') && (
                                <video src={viewingFile.url} controls className="max-h-[70vh] w-full rounded-md" />
                            )}

                            {viewingFile.type.startsWith('audio/') && (
                                <audio src={viewingFile.url} controls className="w-full" />
                            )}

                            {viewingFile.type === 'application/pdf' && (
                                <iframe
                                    src={viewingFile.url}
                                    title={viewingFile.name}
                                    className="h-[70vh] w-full rounded-md border border-hairline"
                                />
                            )}

                            {!viewingFile.type.startsWith('image/') &&
                                !viewingFile.type.startsWith('video/') &&
                                !viewingFile.type.startsWith('audio/') &&
                                viewingFile.type !== 'application/pdf' && (
                                    <div className="flex flex-col items-center gap-3 py-10 text-center">
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
                    </div>
                </div>
            )}
        </div>
    )
}
