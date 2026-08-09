'use client'
// Manual gradebook grid. Columns ("gradebook items") are created by
// the teacher, not generated from assignments/quizzes automatically —
// see gradebook-items.ts and migration 072 for why. A column can
// optionally link to a real assignment or quiz for a one-time score
// pull (pullLinkedScores), after which it's just a normal editable
// column like any other.
//
// Every enrolled student is always a row here, alphabetical by name,
// regardless of whether they have a score yet for any column — that
// comes from the students list this component receives, not from
// which scores exist.

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setGradebookScore, pullLinkedScores } from '@/features/grades/actions/gradebook-items'
import { AddGradebookColumnForm } from './AddGradebookColumnForm'

type ComponentType = 'written_work' | 'performance_task' | 'quarterly_assessment'

type GradebookColumn = {
    id: string
    component: ComponentType
    label: string
    maxScore: number
    linkedAssignmentId: string | null
    linkedQuizId: string | null
}

type GradebookGridData = {
    students: { studentId: string; studentName: string }[]
    items: GradebookColumn[]
    scores: { itemId: string; studentId: string; score: number }[]
    weights: { written_work_pct: number; performance_task_pct: number; quarterly_assessment_pct: number }
}

const COMPONENT_ORDER: ComponentType[] = ['written_work', 'performance_task', 'quarterly_assessment']
const COMPONENT_LABEL: Record<ComponentType, string> = {
    written_work: 'Written work',
    performance_task: 'Performance task',
    quarterly_assessment: 'Quarterly assessment',
}

function round2(n: number) {
    return Math.round(n * 100) / 100
}

export function GradebookGrid({
    courseId,
    initialData,
    canEdit,
    assignmentOptions,
    quizOptions,
}: {
    courseId: string
    initialData: GradebookGridData
    canEdit: boolean
    assignmentOptions: { id: string; title: string; maxScore: number }[]
    quizOptions: { id: string; title: string; maxScore: number }[]
}) {
    const router = useRouter()
    const [items, setItems] = useState(initialData.items)
    const [scores, setScores] = useState(initialData.scores)

    // router.refresh() (used after pulling scores, or after creating a
    // column) re-fetches this page's server data and passes fresh props
    // down, but React does NOT reset an existing useState just because
    // new props arrived — the component stays mounted, so items/scores
    // silently kept their stale initial values, and a pulled score only
    // ever showed up after a full manual browser reload actually
    // remounted this component. Syncing on every initialData change
    // closes that gap without needing a full remount.
    useEffect(() => {
        setItems(initialData.items)
        setScores(initialData.scores)
    }, [initialData])
    const [editingCell, setEditingCell] = useState<{ itemId: string; studentId: string } | null>(null)
    const [draft, setDraft] = useState('')
    const [errorCell, setErrorCell] = useState<string | null>(null)
    const [pullingItemId, setPullingItemId] = useState<string | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [isPending, startTransition] = useTransition()

    const scoreByKey = useMemo(() => {
        const map = new Map<string, number>()
        for (const s of scores) map.set(`${s.itemId}:${s.studentId}`, s.score)
        return map
    }, [scores])

    const itemsByComponent = useMemo(() => {
        const grouped: Record<ComponentType, GradebookColumn[]> = {
            written_work: [],
            performance_task: [],
            quarterly_assessment: [],
        }
        for (const item of items) grouped[item.component].push(item)
        return grouped
    }, [items])

    // Per student: for each component, Total/PS/WS. Ungraded items are
    // excluded from both sums, not counted as zero.
    function computeStudentRow(studentId: string) {
        const componentResults = COMPONENT_ORDER.map((component) => {
            const componentItems = itemsByComponent[component]
            let totalRaw = 0
            let totalMax = 0
            let hasAnyGraded = false
            for (const item of componentItems) {
                const raw = scoreByKey.get(`${item.id}:${studentId}`)
                if (raw === undefined) continue
                hasAnyGraded = true
                totalRaw += raw
                totalMax += item.maxScore
            }
            const ps = hasAnyGraded && totalMax > 0 ? (totalRaw / totalMax) * 100 : null
            const weightPct =
                component === 'written_work'
                    ? initialData.weights.written_work_pct
                    : component === 'performance_task'
                      ? initialData.weights.performance_task_pct
                      : initialData.weights.quarterly_assessment_pct
            const ws = ps !== null ? (ps * weightPct) / 100 : null
            return { component, totalRaw, totalMax, ps, ws, hasAnyGraded }
        })

        const graded = componentResults.filter((c) => c.hasAnyGraded)
        const finalGrade = graded.length > 0 ? round2(graded.reduce((sum, c) => sum + (c.ws ?? 0), 0)) : null

        return { componentResults, finalGrade }
    }

    function openEditor(itemId: string, studentId: string, currentScore: number | undefined) {
        if (!canEdit) return
        setErrorCell(null)
        setEditingCell({ itemId, studentId })
        setDraft(currentScore !== undefined ? String(currentScore) : '')
    }

    function saveEdit(item: GradebookColumn, studentId: string) {
        const value = Number(draft)
        if (draft === '' || Number.isNaN(value) || value < 0 || value > item.maxScore) {
            setErrorCell(`${item.id}:${studentId}`)
            return
        }

        setErrorCell(null)
        startTransition(async () => {
            const result = await setGradebookScore(item.id, studentId, value)
            if (!result.ok) {
                setErrorCell(`${item.id}:${studentId}`)
                return
            }
            setScores((prev) => {
                const next = prev.filter((s) => !(s.itemId === item.id && s.studentId === studentId))
                next.push({ itemId: item.id, studentId, score: value })
                return next
            })
            setEditingCell(null)
        })
    }

    function handlePull(item: GradebookColumn) {
        setPullingItemId(item.id)
        startTransition(async () => {
            const result = await pullLinkedScores(item.id)
            setPullingItemId(null)
            if (result.ok) router.refresh()
        })
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading text-body-emphasis text-ink">Gradebook</h2>
                {canEdit && (
                    <button
                        onClick={() => setShowAddForm((v) => !v)}
                        className="h-9 px-4 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover"
                    >
                        {showAddForm ? 'Close' : 'Add column'}
                    </button>
                )}
            </div>

            {showAddForm && (
                <div className="mb-4">
                    <AddGradebookColumnForm
                        courseId={courseId}
                        assignmentOptions={assignmentOptions.filter(
                            (opt) => !items.some((i) => i.linkedAssignmentId === opt.id)
                        )}
                        quizOptions={quizOptions.filter((opt) => !items.some((i) => i.linkedQuizId === opt.id))}
                        onCreated={(newItem) => {
                            setItems((prev) => [...prev, newItem])
                            setShowAddForm(false)
                            // Refetches assignmentOptions/quizOptions from the
                            // server so a just-linked item disappears from the
                            // dropdown for the next column created this session,
                            // not just after a full page reload.
                            router.refresh()
                        }}
                    />
                </div>
            )}

            {items.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">
                        No gradebook columns yet. Add one to start entering scores.
                    </p>
                </div>
            ) : (
                <div className="bg-surface rounded-md shadow-card overflow-x-auto">
                    <table className="text-left border-collapse">
                        <thead>
                            <tr className="border-b border-hairline">
                                <th className="px-4 py-3 text-label text-text-secondary sticky left-0 bg-surface z-10 whitespace-nowrap">
                                    Student
                                </th>
                                {COMPONENT_ORDER.map((component) =>
                                    itemsByComponent[component].length > 0 ? (
                                        <th
                                            key={component}
                                            colSpan={itemsByComponent[component].length + 3}
                                            className="px-4 py-3 text-label text-text-secondary text-center border-l border-hairline whitespace-nowrap"
                                        >
                                            {COMPONENT_LABEL[component]}
                                        </th>
                                    ) : null
                                )}
                                <th className="px-4 py-3 text-label text-text-secondary text-center border-l border-hairline whitespace-nowrap">
                                    Final grade
                                </th>
                            </tr>
                            <tr className="border-b border-hairline">
                                <th className="px-4 py-2 sticky left-0 bg-surface z-10" />
                                {COMPONENT_ORDER.map((component) =>
                                    itemsByComponent[component].length > 0 ? (
                                        <Fragment key={component}>
                                            {itemsByComponent[component].map((item) => (
                                                <th
                                                    key={item.id}
                                                    className="px-3 py-2 text-caption text-text-secondary font-medium text-center border-l border-hairline whitespace-nowrap max-w-[100px]"
                                                    title={`${item.label} (out of ${item.maxScore})`}
                                                >
                                                    <div className="truncate">{item.label}</div>
                                                    <span className="block text-text-muted">/{item.maxScore}</span>
                                                    {canEdit && (item.linkedAssignmentId || item.linkedQuizId) && (
                                                        <button
                                                            onClick={() => handlePull(item)}
                                                            disabled={pullingItemId === item.id}
                                                            className="mt-1 text-text-muted hover:text-brand underline disabled:opacity-50"
                                                        >
                                                            {pullingItemId === item.id ? 'Pulling…' : 'Pull scores'}
                                                        </button>
                                                    )}
                                                </th>
                                            ))}
                                            <th className="px-3 py-2 text-caption text-text-secondary font-semibold text-center border-l border-hairline">
                                                Total
                                            </th>
                                            <th className="px-3 py-2 text-caption text-text-secondary font-semibold text-center">
                                                PS
                                            </th>
                                            <th className="px-3 py-2 text-caption text-text-secondary font-semibold text-center">
                                                WS
                                            </th>
                                        </Fragment>
                                    ) : null
                                )}
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {initialData.students.map((student) => {
                                const { componentResults, finalGrade } = computeStudentRow(student.studentId)
                                return (
                                    <tr key={student.studentId} className="border-b border-hairline last:border-0">
                                        <td className="px-4 py-3 text-body-emphasis text-ink sticky left-0 bg-surface z-10 whitespace-nowrap">
                                            {student.studentName}
                                        </td>
                                        {COMPONENT_ORDER.map((component) => {
                                            const componentItems = itemsByComponent[component]
                                            if (componentItems.length === 0) return null
                                            const result = componentResults.find((c) => c.component === component)!
                                            return (
                                                <Fragment key={component}>
                                                    {componentItems.map((item) => {
                                                        const cellKey = `${item.id}:${student.studentId}`
                                                        const raw = scoreByKey.get(cellKey)
                                                        const isEditing =
                                                            editingCell?.itemId === item.id &&
                                                            editingCell?.studentId === student.studentId
                                                        const isErrored = errorCell === cellKey

                                                        if (isEditing) {
                                                            return (
                                                                <td
                                                                    key={item.id}
                                                                    className="px-2 py-1 border-l border-hairline text-center"
                                                                >
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        max={item.maxScore}
                                                                        autoFocus
                                                                        value={draft}
                                                                        onChange={(e) => setDraft(e.target.value)}
                                                                        onBlur={() => saveEdit(item, student.studentId)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') saveEdit(item, student.studentId)
                                                                            if (e.key === 'Escape') setEditingCell(null)
                                                                        }}
                                                                        disabled={isPending}
                                                                        className="w-14 h-8 px-1 text-center text-caption text-ink rounded border-[1.5px] border-brand focus:outline-none"
                                                                    />
                                                                </td>
                                                            )
                                                        }

                                                        return (
                                                            <td
                                                                key={item.id}
                                                                onClick={() => openEditor(item.id, student.studentId, raw)}
                                                                className={`px-3 py-3 text-caption text-center border-l border-hairline whitespace-nowrap ${
                                                                    canEdit ? 'cursor-pointer hover:bg-surface-sunken' : ''
                                                                } ${isErrored ? 'bg-error-soft' : ''}`}
                                                            >
                                                                {raw !== undefined ? raw : <span className="text-text-muted">—</span>}
                                                            </td>
                                                        )
                                                    })}
                                                    <td className="px-3 py-3 text-caption text-ink text-center border-l border-hairline font-medium">
                                                        {result.hasAnyGraded ? round2(result.totalRaw) : '—'}
                                                    </td>
                                                    <td className="px-3 py-3 text-caption text-ink text-center">
                                                        {result.ps !== null ? `${round2(result.ps)}%` : '—'}
                                                    </td>
                                                    <td className="px-3 py-3 text-caption text-ink text-center">
                                                        {result.ws !== null ? round2(result.ws) : '—'}
                                                    </td>
                                                </Fragment>
                                            )
                                        })}
                                        <td className="px-4 py-3 text-center border-l border-hairline">
                                            {finalGrade !== null ? (
                                                <span className="inline-flex items-center rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                                                    {finalGrade}%
                                                </span>
                                            ) : (
                                                <span className="text-text-muted text-caption">—</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {errorCell && (
                        <p className="px-4 py-2 text-caption text-error">
                            Could not save that score. Check it's within the max and try again.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
