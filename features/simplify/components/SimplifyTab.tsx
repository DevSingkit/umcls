'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    generateSimplifiedLessonForTeacher,
    editSimplifiedLesson,
    publishSimplifiedLesson,
    unpublishSimplifiedLesson,
} from '@/features/simplify/actions/simplify'

type Simplification = {
    id: string
    content: string
    is_published?: boolean
    updated_at: string
} | null

export function SimplifyTab({
    lessonId,
    initialSimplification,
    isTeacher,
}: {
    lessonId: string
    initialSimplification: Simplification
    isTeacher: boolean
}) {
    const [simplification, setSimplification] = useState(initialSimplification)
    const [draftContent, setDraftContent] = useState(initialSimplification?.content ?? '')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    function handleGenerate() {
        setError(null)
        startTransition(async () => {
            const result = await generateSimplifiedLessonForTeacher(lessonId)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    function handleSaveEdit() {
        setError(null)
        startTransition(async () => {
            const result = await editSimplifiedLesson(lessonId, draftContent)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    function handlePublish() {
        setError(null)
        startTransition(async () => {
            const result = await publishSimplifiedLesson(lessonId)
            if (!result.ok) {
                setError(result.error)
                return
            }
            setSimplification((prev) => (prev ? { ...prev, is_published: true } : prev))
            router.refresh()
        })
    }

    function handleUnpublish() {
        setError(null)
        startTransition(async () => {
            const result = await unpublishSimplifiedLesson(lessonId)
            if (!result.ok) {
                setError(result.error)
                return
            }
            setSimplification((prev) => (prev ? { ...prev, is_published: false } : prev))
            router.refresh()
        })
    }

    if (isTeacher) {
        return (
            <div className="grid gap-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-body-md text-text-secondary">
                        Generate an elementary-reading-level version of this lesson for students who
                        need extra support. Available to any enrolled student once published — not
                        tied to a quiz.
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={isPending}
                        className="h-11 px-6 rounded-md bg-brand text-on-ink text-body-md font-semibold
                                   hover:bg-brand-hover disabled:opacity-60 transition-colors whitespace-nowrap"
                    >
                        {isPending ? 'Generating…' : simplification ? 'Regenerate' : 'Generate'}
                    </button>
                </div>

                {error && <p className="text-caption text-error">{error}</p>}

                {simplification && (
                    <>
                        <div className="flex items-center gap-2">
                            {simplification.is_published ? (
                                <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                                    <span className="w-1.5 h-1.5 rounded-pill bg-brand" />
                                    Published
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-pill bg-hairline text-text-secondary text-caption font-semibold px-3 py-1">
                                    <span className="w-1.5 h-1.5 rounded-pill bg-text-secondary" />
                                    Draft
                                </span>
                            )}
                        </div>

                        <textarea
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            maxLength={4000}
                            rows={10}
                            className="px-4 py-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                       focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 resize-y"
                        />

                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={handleSaveEdit}
                                disabled={isPending || draftContent === simplification.content}
                                className="h-11 px-6 rounded-md bg-surface text-ink border-[1.5px] border-hairline-strong text-body-md font-semibold
                                           hover:bg-surface-sunken disabled:opacity-60 transition-colors"
                            >
                                Save changes
                            </button>

                            {simplification.is_published ? (
                                <button
                                    onClick={handleUnpublish}
                                    disabled={isPending}
                                    className="h-11 px-6 rounded-md bg-surface text-error border-[1.5px] border-error text-body-md font-semibold
                                               hover:bg-error-soft disabled:opacity-60 transition-colors"
                                >
                                    {isPending ? 'Unpublishing…' : 'Unpublish'}
                                </button>
                            ) : (
                                <button
                                    onClick={handlePublish}
                                    disabled={isPending}
                                    className="h-11 px-6 rounded-md bg-brand text-on-ink text-body-md font-semibold
                                               hover:bg-brand-hover disabled:opacity-60 transition-colors"
                                >
                                    {isPending ? 'Publishing…' : 'Approve & Publish'}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        )
    }

    // Student view
    if (!simplification) {
        return (
            <div className="bg-surface rounded-md shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary">
                    No simplified version of this lesson is available yet. Check back later, or ask
                    your teacher if you need extra help understanding it.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-surface rounded-md shadow-card p-8">
            <p className="text-body-lg text-ink-soft whitespace-pre-wrap">{simplification.content}</p>
        </div>
    )
}
