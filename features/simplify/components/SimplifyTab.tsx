'use client'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
    generateSimplifiedLessonForTeacher,
    editSimplifiedLesson,
    publishSimplifiedLesson,
    unpublishSimplifiedLesson,
} from '@/features/simplify/actions/simplify'
import { updatePreferredSimplifyLanguage } from '@/features/settings/actions/settings'

type SimplifyLanguage = 'english' | 'tagalog'

type Simplification = {
    id: string
    language: SimplifyLanguage
    content: string
    is_published?: boolean
    updated_at: string
}

const LANGUAGE_LABEL: Record<SimplifyLanguage, string> = {
    english: 'English',
    tagalog: 'Tagalog',
}

// ---------- Teacher view ----------
// Shows both languages side by side (as two switchable tabs, not two
// stacked forms — keeps the page from feeling doubled). Each language
// is generated, edited, and published completely independently; a
// teacher can build only one, or both.

function TeacherSimplifyView({
    lessonId,
    initialSimplifications,
}: {
    lessonId: string
    initialSimplifications: Simplification[]
}) {
    const [activeLanguage, setActiveLanguage] = useState<SimplifyLanguage>('english')
    const [simplifications, setSimplifications] = useState(initialSimplifications)
    const [draftContent, setDraftContent] = useState<Record<SimplifyLanguage, string>>({
        english: initialSimplifications.find((s) => s.language === 'english')?.content ?? '',
        tagalog: initialSimplifications.find((s) => s.language === 'tagalog')?.content ?? '',
    })
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const current = simplifications.find((s) => s.language === activeLanguage) ?? null

    function handleGenerate() {
        setError(null)
        startTransition(async () => {
            const result = await generateSimplifiedLessonForTeacher(lessonId, activeLanguage)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    function handleSaveEdit() {
        if (!current) return
        setError(null)
        startTransition(async () => {
            const result = await editSimplifiedLesson(lessonId, activeLanguage, draftContent[activeLanguage])
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
            const result = await publishSimplifiedLesson(lessonId, activeLanguage)
            if (!result.ok) {
                setError(result.error)
                return
            }
            setSimplifications((prev) =>
                prev.map((s) => (s.language === activeLanguage ? { ...s, is_published: true } : s))
            )
            router.refresh()
        })
    }

    function handleUnpublish() {
        setError(null)
        startTransition(async () => {
            const result = await unpublishSimplifiedLesson(lessonId, activeLanguage)
            if (!result.ok) {
                setError(result.error)
                return
            }
            setSimplifications((prev) =>
                prev.map((s) => (s.language === activeLanguage ? { ...s, is_published: false } : s))
            )
            router.refresh()
        })
    }

    return (
        <div className="grid gap-4">
            <p className="text-body-md text-text-secondary">
                Generate an elementary-reading-level version of this lesson for students who need extra
                support. Available to any enrolled student once published — not tied to a quiz. Build
                English, Tagalog, or both — a student sees whichever language they&apos;ve picked.
            </p>

            {/* Language sub-tabs, DESIGN-LMS.md §6.3 in-page tab pattern */}
            <div className="inline-flex w-fit rounded-pill bg-surface p-1 shadow-card">
                {(['english', 'tagalog'] as const).map((lang) => {
                    const published = simplifications.some((s) => s.language === lang && s.is_published)
                    return (
                        <button
                            key={lang}
                            onClick={() => setActiveLanguage(lang)}
                            className={
                                'flex items-center gap-2 rounded-pill px-4 py-2 text-body-md font-semibold transition-colors ' +
                                (activeLanguage === lang ? 'bg-brand text-on-ink' : 'text-ink-soft hover:bg-surface-sunken')
                            }
                        >
                            {LANGUAGE_LABEL[lang]}
                            {published && (
                                <span
                                    className={
                                        'h-1.5 w-1.5 rounded-pill ' +
                                        (activeLanguage === lang ? 'bg-on-ink' : 'bg-brand')
                                    }
                                />
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    {current?.is_published ? (
                        <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                            <span className="w-1.5 h-1.5 rounded-pill bg-brand" />
                            Published
                        </span>
                    ) : current ? (
                        <span className="inline-flex items-center gap-1.5 rounded-pill bg-hairline text-text-secondary text-caption font-semibold px-3 py-1">
                            <span className="w-1.5 h-1.5 rounded-pill bg-text-secondary" />
                            Draft
                        </span>
                    ) : (
                        <span className="text-caption text-text-secondary">
                            No {LANGUAGE_LABEL[activeLanguage]} version yet
                        </span>
                    )}
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isPending}
                    className="h-11 px-6 rounded-md bg-brand text-on-ink text-body-md font-semibold
                               hover:bg-brand-hover disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                    {isPending
                        ? 'Generating…'
                        : current
                          ? `Regenerate ${LANGUAGE_LABEL[activeLanguage]}`
                          : `Generate ${LANGUAGE_LABEL[activeLanguage]}`}
                </button>
            </div>

            {error && <p className="text-caption text-error">{error}</p>}

            {current && (
                <>
                    <textarea
                        value={draftContent[activeLanguage]}
                        onChange={(e) =>
                            setDraftContent((prev) => ({ ...prev, [activeLanguage]: e.target.value }))
                        }
                        maxLength={4000}
                        rows={10}
                        className="px-4 py-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 resize-y"
                    />

                    <div className="flex gap-3 flex-wrap">
                        <button
                            onClick={handleSaveEdit}
                            disabled={isPending || draftContent[activeLanguage] === current.content}
                            className="h-11 px-6 rounded-md bg-surface text-ink border-[1.5px] border-hairline-strong text-body-md font-semibold
                                       hover:bg-surface-sunken disabled:opacity-60 transition-colors"
                        >
                            Save changes
                        </button>

                        {current.is_published ? (
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

// ---------- Student view ----------
// Toggle sits right on the page, per explicit request — students are
// less likely to go hunting in a separate Settings screen.
//
// Language switch is a real navigation, not a fake client-side sync:
// clicking a language updates the "lang" URL search param, which the
// parent server component (the lesson page) reads to fetch that
// language's content via getSimplifiedLessonForStudent(lessonId,
// language) and pass back down as a fresh initialContent prop. This
// keeps data-fetching entirely server-side, matching how every other
// action in this file already works — no duplicate client fetch logic
// needed here.

function StudentSimplifyView({
    lessonId,
    initialContent,
    initialLanguage,
    availableLanguages,
}: {
    lessonId: string
    initialContent: string | null
    initialLanguage: SimplifyLanguage
    availableLanguages: SimplifyLanguage[]
}) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    function handlePick(lang: SimplifyLanguage) {
        if (lang === initialLanguage) return

        startTransition(async () => {
            // Save quietly in the background so it's remembered on every
            // other lesson too. A failed save here shouldn't block
            // reading — it just means the choice won't stick next time.
            await updatePreferredSimplifyLanguage(lang)

            const params = new URLSearchParams(searchParams.toString())
            params.set('lang', lang)
            router.push(`${pathname}?${params.toString()}`)
        })
    }

    return (
        <div className="grid gap-4">
            <div className="inline-flex w-fit rounded-pill bg-surface p-1 shadow-card">
                {(['english', 'tagalog'] as const).map((lang) => (
                    <button
                        key={lang}
                        onClick={() => handlePick(lang)}
                        disabled={isPending}
                        className={
                            'rounded-pill px-4 py-2 text-body-md font-semibold transition-colors disabled:opacity-60 ' +
                            (initialLanguage === lang ? 'bg-brand text-on-ink' : 'text-ink-soft hover:bg-surface-sunken')
                        }
                    >
                        {LANGUAGE_LABEL[lang]}
                    </button>
                ))}
            </div>

            {initialContent ? (
                <div className="bg-surface rounded-md shadow-card p-8">
                    <p className="text-body-lg text-ink-soft whitespace-pre-wrap">{initialContent}</p>
                </div>
            ) : (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">
                        {(() => {
                            const otherLanguage = availableLanguages[0]
                            if (!otherLanguage) {
                                return 'No simplified version of this lesson is available yet. Check back later, or ask your teacher if you need extra help understanding it.'
                            }
                            return `Not available in ${LANGUAGE_LABEL[initialLanguage]} yet. Try ${LANGUAGE_LABEL[otherLanguage]} above.`
                        })()}
                    </p>
                </div>
            )}
        </div>
    )
}

// ---------- Exported entry point ----------

export function SimplifyTab({
    lessonId,
    isTeacher,
    // Teacher props
    initialSimplifications,
    // Student props
    initialContent,
    initialLanguage,
    availableLanguages,
}: {
    lessonId: string
    isTeacher: boolean
    initialSimplifications?: Simplification[]
    initialContent?: string | null
    initialLanguage?: SimplifyLanguage
    availableLanguages?: SimplifyLanguage[]
}) {
    if (isTeacher) {
        return (
            <TeacherSimplifyView lessonId={lessonId} initialSimplifications={initialSimplifications ?? []} />
        )
    }

    return (
        <StudentSimplifyView
            lessonId={lessonId}
            initialContent={initialContent ?? null}
            initialLanguage={initialLanguage ?? 'english'}
            availableLanguages={availableLanguages ?? []}
        />
    )
}
