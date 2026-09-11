'use client'
// components/ui/AttachmentPreview.tsx
//
// Shared attachment preview card per DESIGN-LMS.md §8.11 — replaces
// the bare emoji-icon treatment materials/attachments used to get.
// Three visual cases share one card shell: image (thumbnail),
// YouTube link (thumbnail + play overlay), and generic link/file
// (icon chip, no thumbnail).
//
// v2: fixed icon-chip color. §8.11 specifies the no-thumbnail "any
// other URL" case uses a `surface-sunken` chip, not an amber one —
// amber is reserved for due-soon/attention states elsewhere in this
// app, not a generic icon container. Applied the same neutral chip to
// the image/file fallback cases too for one consistent treatment.
//
// Deliberately a plain clickable <div role="button"> rather than a
// literal <button>, even though §8.11 says "the whole card is the tap
// target" — a real <button> can't legally contain another interactive
// element (e.g. a Remove button in MaterialList's trailing slot), and
// nesting two real buttons is invalid HTML / breaks the a11y tree.
// This trades a small amount of semantic purity for a valid, working
// structure: the row is keyboard-operable (Enter/Space) and
// screen-reader-announced as a button via role, while a real nested
// <button> (e.g. Remove) still works correctly with its own
// stopPropagation.

import { Link as LinkIcon, Image as ImageIcon, Paperclip, Play } from 'lucide-react'

export type AttachmentKind = 'image' | 'youtube' | 'link' | 'file'

export function AttachmentPreview({
    title,
    sourceLabel,
    kind,
    thumbnailUrl,
    onClick,
    trailing,
}: {
    title: string
    sourceLabel: string
    kind: AttachmentKind
    thumbnailUrl?: string | null
    onClick?: () => void
    trailing?: React.ReactNode
}) {
    return (
        <div
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={
                onClick
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onClick()
                          }
                      }
                    : undefined
            }
            className={`flex w-full items-center gap-4 rounded-md bg-surface border border-hairline shadow-card hover:shadow-card-hover p-3 transition-shadow ${
                onClick ? 'cursor-pointer' : ''
            }`}
        >
            {thumbnailUrl ? (
                <span className="relative shrink-0 w-16 h-16 rounded-md overflow-hidden bg-surface-sunken">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external/public thumbnail URL (YouTube CDN or public storage), plain <img> is simplest */}
                    <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    {kind === 'youtube' && (
                        <span className="absolute inset-0 flex items-center justify-center bg-ink/30">
                            <Play size={20} className="text-on-ink" fill="currentColor" aria-hidden="true" />
                        </span>
                    )}
                </span>
            ) : (
                <span className="shrink-0 w-10 h-10 rounded-md bg-surface-sunken text-text-secondary flex items-center justify-center">
                    {kind === 'image' ? (
                        <ImageIcon size={18} aria-hidden="true" />
                    ) : kind === 'link' ? (
                        <LinkIcon size={18} aria-hidden="true" />
                    ) : (
                        <Paperclip size={18} aria-hidden="true" />
                    )}
                </span>
            )}
            <div className="min-w-0 flex-1">
                <p className="text-body-emphasis text-ink truncate">{title}</p>
                <p className="text-caption text-text-secondary truncate">{sourceLabel}</p>
            </div>
            {trailing}
        </div>
    )
}
