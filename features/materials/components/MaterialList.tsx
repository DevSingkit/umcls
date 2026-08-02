'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMaterial, getMaterialDownloadUrl } from '@/features/materials/actions/materials'

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

export function MaterialList({
    materials,
    canDelete = false,
}: {
    materials: Material[]
    canDelete?: boolean
}) {
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    async function handleDownload(materialId: string) {
        const url = await getMaterialDownloadUrl(materialId)
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer')
        }
    }

    function handleDelete(materialId: string) {
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
            {materials.map((material) => (
                <div
                    key={material.id}
                    className="bg-surface rounded-md shadow-card hover:shadow-card-hover p-4 flex items-center gap-4 transition-shadow"
                >
                    <span className="w-9 h-9 shrink-0 rounded-md bg-amber-soft text-amber flex items-center justify-center text-body-md font-bold">
                        {material.external_url ? '🔗' : '📎'}
                    </span>
                    <button
                        onClick={() => handleDownload(material.id)}
                        className="flex-1 text-left"
                    >
                        <span className="block text-body-emphasis text-ink hover:underline">
                            {material.file_name}
                        </span>
                        <span className="block text-caption text-text-secondary">
                            {formatSize(material.file_size_bytes)}
                        </span>
                    </button>
                    {canDelete && (
                        <button
                            onClick={() => handleDelete(material.id)}
                            disabled={isPending && pendingId === material.id}
                            className="text-caption font-medium text-error hover:underline disabled:opacity-60"
                        >
                            Remove
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}