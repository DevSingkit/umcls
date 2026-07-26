'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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

    useEffect(() => {
        function checkScrollDepth() {
            if (hasFired.current) return
            const scrolledPast = window.scrollY + window.innerHeight
            const fullHeight = document.documentElement.scrollHeight
            const percent = fullHeight > 0 ? scrolledPast / fullHeight : 1
            if (percent >= 0.9) {
                hasFired.current = true
                markLessonComplete(lessonId).then(() => {
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
        </div>
    )
}