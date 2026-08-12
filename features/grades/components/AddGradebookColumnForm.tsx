'use client'
// Creates one gradebook column. Label is free text on purpose ("A1",
// "Q1", "R" for recitation, whatever the teacher wants) — see
// gradebook-items.ts. Linking to a real assignment or quiz is
// optional; if set, the grid shows a "Pull scores" action on that
// column afterward, a one-time copy, not an ongoing sync.

import { useState, useTransition } from 'react'
import { createGradebookItem } from '@/features/grades/actions/gradebook-items'

type ComponentType = 'written_work' | 'performance_task' | 'quarterly_assessment'

const COMPONENT_OPTIONS: { value: ComponentType; label: string }[] = [
    { value: 'written_work', label: 'Written work' },
    { value: 'performance_task', label: 'Performance task' },
    { value: 'quarterly_assessment', label: 'Quarterly assessment' },
]

export function AddGradebookColumnForm({
    courseId,
    assignmentOptions,
    quizOptions,
    onCreated,
}: {
    courseId: string
    assignmentOptions: { id: string; title: string; maxScore: number }[]
    quizOptions: { id: string; title: string; maxScore: number }[]
    onCreated: (item: {
        id: string
        component: ComponentType
        label: string
        maxScore: number
        linkedAssignmentId: string | null
        linkedQuizId: string | null
    }) => void
}) {
    const [component, setComponent] = useState<ComponentType>('written_work')
    const [label, setLabel] = useState('')
    const [maxScore, setMaxScore] = useState('')
    const [linkType, setLinkType] = useState<'none' | 'assignment' | 'quiz'>('none')
    const [linkedId, setLinkedId] = useState('')
    const [error, setError] = useState('')
    const [isPending, startTransition] = useTransition()

    // Max score is locked (read-only, auto-filled) whenever a link is
    // actually chosen — that's the whole point of linking: the column's
    // max score must always match the real assignment/quiz's max score,
    // never something a teacher typed separately that could drift out
    // of sync with it. Only "not linked" leaves it open for manual entry.
    const maxScoreLocked = linkType !== 'none' && linkedId !== ''

    function handleLinkTypeChange(value: 'none' | 'assignment' | 'quiz') {
        setLinkType(value)
        setLinkedId('')
        if (value === 'none') setMaxScore('')
    }

    function handleLinkedIdChange(id: string) {
        setLinkedId(id)
        if (!id) {
            setMaxScore('')
            return
        }
        const options = linkType === 'assignment' ? assignmentOptions : quizOptions
        const picked = options.find((opt) => opt.id === id)
        if (picked) setMaxScore(String(picked.maxScore))
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        const parsedMax = Number(maxScore)
        if (!label.trim()) {
            setError('Enter a label for this column.')
            return
        }
        if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
            setError('Max score must be greater than 0.')
            return
        }

        startTransition(async () => {
            const result = await createGradebookItem(
                courseId,
                component,
                label,
                parsedMax,
                linkType === 'assignment' ? linkedId || null : null,
                linkType === 'quiz' ? linkedId || null : null
            )
            if (!result.ok) {
                setError(result.error)
                return
            }
            onCreated({
                id: result.id,
                component,
                label: label.trim(),
                maxScore: parsedMax,
                linkedAssignmentId: linkType === 'assignment' ? linkedId || null : null,
                linkedQuizId: linkType === 'quiz' ? linkedId || null : null,
            })
            setLabel('')
            setMaxScore('')
            setLinkType('none')
            setLinkedId('')
        })
    }

    return (
        <form onSubmit={handleSubmit} className="bg-surface rounded-md border border-hairline shadow-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label className="text-label text-ink-soft block mb-1">Component</label>
                    <select
                        value={component}
                        onChange={(e) => setComponent(e.target.value as ComponentType)}
                        className="h-9 w-full px-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink"
                    >
                        {COMPONENT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-label text-ink-soft block mb-1">Label</label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="A1, Q1, R…"
                        className="h-9 w-full px-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink"
                    />
                </div>

                <div>
                    <label className="text-label text-ink-soft block mb-1">Max score</label>
                    <input
                        type="number"
                        min={1}
                        value={maxScore}
                        onChange={(e) => setMaxScore(e.target.value)}
                        readOnly={maxScoreLocked}
                        disabled={maxScoreLocked}
                        placeholder="e.g. 100"
                        className={`h-9 w-full px-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink ${
                            maxScoreLocked ? 'bg-surface-sunken text-text-secondary cursor-not-allowed' : ''
                        }`}
                    />
                    {maxScoreLocked && (
                        <p className="text-caption text-text-muted mt-1">
                            Matches the linked item&apos;s max score automatically.
                        </p>
                    )}
                </div>

                <div>
                    <label className="text-label text-ink-soft block mb-1">Link to (optional)</label>
                    <select
                        value={linkType}
                        onChange={(e) => handleLinkTypeChange(e.target.value as 'none' | 'assignment' | 'quiz')}
                        className="h-9 w-full px-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink"
                    >
                        <option value="none">Not linked, type scores manually</option>
                        <option value="assignment">An assignment</option>
                        <option value="quiz">A quiz</option>
                    </select>
                </div>

                {linkType !== 'none' && (
                    <div className="sm:col-span-2">
                        <label className="text-label text-ink-soft block mb-1">
                            {linkType === 'assignment' ? 'Assignment' : 'Quiz'}
                        </label>
                        <select
                            value={linkedId}
                            onChange={(e) => handleLinkedIdChange(e.target.value)}
                            className="h-9 w-full px-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink"
                        >
                            <option value="">Select one</option>
                            {(linkType === 'assignment' ? assignmentOptions : quizOptions).map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.title} (/{opt.maxScore})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {error && <p className="text-caption text-error mt-3">{error}</p>}

            <div className="mt-4">
                <button
                    type="submit"
                    disabled={isPending}
                    className="h-9 px-4 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover disabled:opacity-60"
                >
                    {isPending ? 'Creating…' : 'Create column'}
                </button>
            </div>
        </form>
    )
}
