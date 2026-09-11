'use client'
// features/materials/components/MaterialList.tsx
//
// Rewritten to use AttachmentPreview (DESIGN-LMS.md §8.11) instead of
// the old bare emoji-icon row. All existing behavior is unchanged —
// same download-on-click flow via getMaterialDownloadUrl, same
// canDelete/Remove logic — only the visual card changed.
//
// classify() decides which of AttachmentPreview's three visual cases
// applies:
//   - external_url matching a YouTube pattern -> 'youtube', with a
//     real thumbnail pulled from YouTube's public img.youtube.com CDN
//     (no auth needed, safe to render eagerly for every row).
//   - any other external_url -> 'link', icon chip only, domain as the
//     source label.
//   - an uploaded file whose file_type starts with 'image/' -> 'image'
//     kind, but deliberately NO eager thumbnail: the real file URL is
//     only resolved on click via getMaterialDownloadUrl (may be a
//     signed URL depending on the materials bucket's access rules,
//     which weren't available to verify), and eagerly resolving one
//     per row just to show a thumbnail isn't worth the request volume
//     or the risk of assuming public access that may not be there.
//     Falls back to the icon-chip treatment — §8.11 already allows an
//     icon-only left slot when no thumbnail is available.
//   - any other uploaded file -> 'file', icon chip, formatted size as
//     the source label.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMaterial, getMaterialDownloadUrl } from '@/features/materials/actions/materials'
import { AttachmentPreview, type AttachmentKind } from '@/components/ui/AttachmentPreview'
import { toYoutubeEmbedUrl } from '@/lib/utils/youtube'
import { X } from 'lucide-react'

type Material = {
    id: string
    file_name: string
    file_type: string
    file_size_bytes: number | null
    external_url?: string | null
    created_at: string
}

function formatSize(bytes: number | null) {
    if (bytes === null) return 'External link'
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Matches youtube.com/watch?v=, youtube.com/shorts/, and youtu.be/
// short links, capturing the 11-character video id.
const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/

function classify(material: Material): {
    kind: AttachmentKind
    sourceLabel: string
    thumbnailUrl: string | null
    videoId: string | null
} {
    if (material.external_url) {
        const match = material.external_url.match(YOUTUBE_RE)
        if (match) {
            return {
                kind: 'youtube',
                sourceLabel: 'youtube.com',
                thumbnailUrl: `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`,
                videoId: match[1] ?? null,
            }
        }
        let domain = material.external_url
        try {
            domain = new URL(material.external_url).hostname.replace(/^www\./, '')
        } catch {
            // Not a parseable absolute URL — fall back to showing it raw
            // rather than throwing.
        }
        return { kind: 'link', sourceLabel: domain, thumbnailUrl: null, videoId: null }
    }

    if (material.file_type?.startsWith('image/')) {
        return { kind: 'image', sourceLabel: 'Image', thumbnailUrl: null, videoId: null }
    }

    return { kind: 'file', sourceLabel: formatSize(material.file_size_bytes), thumbnailUrl: null, videoId: null }
}

export function MaterialList({
    materials,
    canDelete = false,
    onDelete,
    deletingId,
}: {
    materials: Material[]
    canDelete?: boolean
    // Lets a caller (e.g. EditLessonForm, which manages its own
    // optimistic material list via listMaterials/refresh rather than
    // router.refresh) supply its own delete flow instead of this
    // component's built-in deleteMaterial+router.refresh. When
    // omitted, behavior is unchanged from before.
    onDelete?: (materialId: string) => void
    deletingId?: string | null
}) {
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    // Inline preview overlay — replaces window.open() for images and
    // YouTube links so they show on THIS page, not a new tab. Links and
    // generic files still open via getMaterialDownloadUrl in a new tab,
    // since those aren't things a lightbox makes sense for.
    const [preview, setPreview] = useState<{ kind: 'image'; url: string } | { kind: 'youtube'; videoId: string } | null>(null)

    async function handleDownload(materialId: string) {
        const url = await getMaterialDownloadUrl(materialId)
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer')
        }
    }

    async function handlePreviewClick(material: Material, kind: AttachmentKind, videoId: string | null) {
        if (kind === 'youtube' && videoId) {
            setPreview({ kind: 'youtube', videoId })
            return
        }
        if (kind === 'image') {
            const url = await getMaterialDownloadUrl(material.id)
            if (url) setPreview({ kind: 'image', url })
            return
        }
        await handleDownload(material.id)
    }

    function handleDelete(materialId: string) {
        if (onDelete) {
            onDelete(materialId)
            return
        }
        setPendingId(materialId)
        startTransition(async () => {
            const result = await deleteMaterial(materialId)
            if (!result.ok) {
                console.error('Failed to delete material', materialId, result.error)
            }
            router.refresh()
        })
    }

    if (materials.length === 0) {
        return (
            <div className="bg-surface rounded-md shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary">No materials attached.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-2">
            {materials.map((material) => {
                const { kind, sourceLabel, thumbnailUrl, videoId } = classify(material)
                const isRemoving = onDelete ? deletingId === material.id : isPending && pendingId === material.id
                return (
                    <AttachmentPreview
                        key={material.id}
                        title={material.file_name}
                        sourceLabel={sourceLabel}
                        kind={kind}
                        thumbnailUrl={thumbnailUrl}
                        onClick={() => handlePreviewClick(material, kind, videoId)}
                        trailing={
                            canDelete ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDelete(material.id)
                                    }}
                                    disabled={isRemoving}
                                    className="shrink-0 text-caption font-medium text-error hover:underline disabled:opacity-60"
                                >
                                    {isRemoving ? 'Removing…' : 'Remove'}
                                </button>
                            ) : undefined
                        }
                    />
                )
            })}

            {preview && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
                    onClick={() => setPreview(null)}
                >
                    <button
                        type="button"
                        onClick={() => setPreview(null)}
                        aria-label="Close preview"
                        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-pill bg-surface text-ink shadow-card hover:bg-surface-sunken"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>

                    {preview.kind === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element -- resolved download URL (may be signed), plain <img> is simplest
                        <img
                            src={preview.url}
                            alt=""
                            onClick={(e) => e.stopPropagation()}
                            className="max-h-[85vh] max-w-[90vw] w-auto h-auto rounded-md object-contain shadow-modal"
                        />
                    ) : (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-3xl aspect-video rounded-md overflow-hidden shadow-modal"
                        >
                            <iframe
                                src={toYoutubeEmbedUrl(preview.videoId)}
                                title="Video preview"
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
