'use client'
// features/lessons/components/LessonReader.tsx
//
// v2 — adds a live reading-progress bar and a real completion
// confirmation, per product request to match Quizizz/Duolingo energy.
// Core logic is UNCHANGED: same scroll-depth-triggers-complete rule
// (90%), same markLessonComplete call, same props. What's new:
//   - A slim progress bar pinned to the top of the reader that fills
//     as the student scrolls, so there's constant visible feedback
//     instead of a silent background check.
//   - A real "Lesson complete!" confirmation banner once
//     markLessonComplete succeeds, instead of a bare router.refresh()
//     with no on-screen acknowledgment at all.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { markLessonComplete } from '@/features/lessons/actions/completions'
import { extractYoutubeVideoId, toYoutubeEmbedUrl } from '@/lib/utils/youtube'

export function LessonReader({
    lessonId,
    title,
    courseTitle,
    body,
    youtubeUrl,
}: {
    lessonId: string
    title: string
    courseTitle?: string | null
    body: string
    youtubeUrl?: string | null
}) {
    const hasFired = useRef(false)
    const router = useRouter()
    const [scrollPercent, setScrollPercent] = useState(0)
    const [justCompleted, setJustCompleted] = useState(false)

    useEffect(() => {
        function checkScrollDepth() {
            const scrolledPast = window.scrollY + window.innerHeight
            const fullHeight = document.documentElement.scrollHeight
            const percent = fullHeight > 0 ? scrolledPast / fullHeight : 1
            setScrollPercent(Math.min(1, percent))

            if (hasFired.current) return
            if (percent >= 0.9) {
                hasFired.current = true
                markLessonComplete(lessonId).then(() => {
                    setJustCompleted(true)
                    router.refresh()
                })
                window.removeEventListener('scroll', checkScrollDepth)
            }
        }
        window.addEventListener('scroll', checkScrollDepth, { passive: true })
        checkScrollDepth()
        return () => window.removeEventListener('scroll', checkScrollDepth)
    }, [lessonId, router])

    const videoId = youtubeUrl ? extractYoutubeVideoId(youtubeUrl) : null

    return (
        <div className="max-w-[640px] mx-auto">
            {/* Reading progress bar — pinned to the top of the viewport
                so it's always visible while scrolling, same idea as
                Quizizz/Duolingo's ever-present progress indicators. */}
            <div className="fixed top-0 left-0 right-0 z-40 h-1.5 bg-hairline">
                <div
                    className="h-full bg-brand transition-[width] duration-150 ease-out"
                    style={{ width: `${scrollPercent * 100}%` }}
                />
            </div>

            <p className="text-label text-text-secondary">
                {courseTitle}
            </p>
            <h1 className="font-heading text-h1 text-ink mt-1 mb-8">{title}</h1>

            {videoId && (
                <div className="mb-6 rounded-md overflow-hidden shadow-card aspect-video">
                    <iframe
                        src={toYoutubeEmbedUrl(videoId)}
                        title={`${title} — video`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                    />
                </div>
            )}

            <div className="bg-surface rounded-md shadow-card p-8">
                <p className="text-body-lg text-ink-soft whitespace-pre-wrap">{body}</p>
            </div>

            {/* Completion confirmation — replaces the old silent
                router.refresh() with real, visible acknowledgment. */}
            {justCompleted && (
                <div className="mt-6 flex items-center gap-3 bg-brand-soft border-2 border-brand rounded-md p-5">
                    <CheckCircle2 size={28} className="text-brand shrink-0" aria-hidden="true" />
                    <div>
                        <p className="font-heading text-h3 text-brand">Lesson complete!</p>
                        <p className="text-caption text-text-secondary">Nice work — this lesson is marked as done.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
