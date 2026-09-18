'use client'

import { useState, useRef } from 'react'

interface ImageCropperModalProps {
    imageSrc: string
    onCancel: () => void
    onCropAndCompress: (croppedFile: File) => void
}

export function ImageCropperModal({ imageSrc, onCancel, onCropAndCompress }: ImageCropperModalProps) {
    const [zoom, setZoom] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const imgRef = useRef<HTMLImageElement>(null)

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        setOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        })
    }

    const handleMouseUp = () => setIsDragging(false)

    const handleSave = async () => {
        if (!imgRef.current) return

        const canvas = document.createElement('canvas')
        const targetSize = 400 // Standardized compressed size for profile avatar
        canvas.width = targetSize
        canvas.height = targetSize

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const img = imgRef.current
        const cropBoxSize = 250 // Size of circular viewport box in UI

        // Calculate aspect ratio scale between real image and UI view
        const scale = (img.naturalWidth / img.width) / zoom

        // Draw cropped area into 400x400 canvas
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, targetSize, targetSize)

        const sourceX = (img.width / 2 - offset.x / zoom - cropBoxSize / (2 * zoom)) * (img.naturalWidth / img.width)
        const sourceY = (img.height / 2 - offset.y / zoom - cropBoxSize / (2 * zoom)) * (img.naturalHeight / img.height)
        const sourceSize = (cropBoxSize * (img.naturalWidth / img.width)) / zoom

        ctx.drawImage(
            img,
            Math.max(0, sourceX),
            Math.max(0, sourceY),
            sourceSize,
            sourceSize,
            0,
            0,
            targetSize,
            targetSize
        )

        // Automatically compress to WEBP format (0.85 quality yields ~30KB-80KB)
        canvas.toBlob(
            (blob) => {
                if (!blob) return
                const compressedFile = new File([blob], 'avatar.webp', { type: 'image/webp' })
                onCropAndCompress(compressedFile)
            },
            'image/webp',
            0.85
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-surface rounded-xl p-6 shadow-modal max-w-md w-full border border-hairline space-y-5">
                <div>
                    <h3 className="text-h3 text-ink">Crop Your Profile Photo</h3>
                    <p className="text-caption text-text-secondary">Drag to position and adjust zoom.</p>
                </div>

                {/* Circular Crop Viewport */}
                <div
                    className="relative h-64 w-full bg-black/90 rounded-lg overflow-hidden flex items-center justify-center cursor-move select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element -- imageSrc is a blob/data URL from a freshly selected file; next/image can't optimize it and this needs a raw <img> ref for canvas pixel access (naturalWidth/naturalHeight, drawImage) */}
                    <img
                        ref={imgRef}
                        src={imageSrc}
                        alt="Crop target"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                            maxHeight: '100%',
                            maxWidth: '100%',
                            objectFit: 'contain',
                        }}
                        draggable={false}
                    />

                    {/* Circular Mask Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-[250px] h-[250px] rounded-full border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="space-y-1">
                    <label className="text-caption font-semibold text-text-secondary">Zoom</label>
                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full accent-brand cursor-pointer"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-12 px-5 rounded-md text-body-md font-semibold text-text-secondary hover:bg-surface-sunken"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="h-12 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover"
                    >
                        Crop & Save
                    </button>
                </div>
            </div>
        </div>
    )
}
