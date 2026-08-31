'use client'
// features/missions/components/MissionProgressOverride.tsx
//
// Gap #3 fix (2026-08-30, continued conversation): a teacher-facing
// manual override for mission_progress, explicitly deferred when that
// table was first built (migration 082's own comment: "Teacher-facing
// manual override deferred (per request — settings to be added
// later)"). No existing UI to mirror for this shape, so structured
// after GradebookGrid.tsx's per-student-row table — the closest
// existing "teacher looks at every enrolled student's state for one
// thing" precedent — but with real per-row WRITE actions instead of
// GradebookGrid's read-only cells, since that's the actual point here.
//
// Each row shows a student's current status/streak (real or the
// computed bootstrapping default — see hasRealRow on the row type)
// and offers four actions: Unlock, Lock, Mark mastered, Reset streak.
// Every action re-fetches nothing client-side — router.refresh() pulls
// fresh server data after each call, same pattern used throughout this
// app's other override/toggle components.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    overrideMissionProgress,
    type MissionProgressOverrideRow,
    type OverrideMissionProgressAction,
} from '@/features/missions/actions/create-mission'

const STATUS_LABEL: Record<string, string> = {
    locked: 'Locked',
    unlocked: 'Unlocked',
    mastered: 'Mastered',
}

const STATUS_BADGE_CLASS: Record<string, string> = {
    locked: 'bg-hairline text-text-secondary',
    unlocked: 'bg-info-soft text-info',
    mastered: 'bg-brand-soft text-brand',
}

export function MissionProgressOverride({
    missionId,
    rows,
    masteryThreshold,
}: {
    missionId: string
    rows: MissionProgressOverrideRow[]
    masteryThreshold: number
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [pendingStudentId, setPendingStudentId] = useState<string | null>(null)
    const [errorByStudentId, setErrorByStudentId] = useState<Record<string, string>>({})

    function handleAction(studentId: string, action: OverrideMissionProgressAction) {
        setErrorByStudentId((prev) => ({ ...prev, [studentId]: '' }))
        setPendingStudentId(studentId)
        startTransition(async () => {
            const result = await overrideMissionProgress(missionId, studentId, action)
            if (!result.ok) {
                setErrorByStudentId((prev) => ({ ...prev, [studentId]: result.error }))
                setPendingStudentId(null)
                return
            }
            router.refresh()
            setPendingStudentId(null)
        })
    }

    if (rows.length === 0) {
        return (
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 text-center">
                <p className="text-body-md text-text-secondary">No students enrolled yet.</p>
            </div>
        )
    }

    return (
        <div className="bg-surface rounded-md border border-hairline shadow-card overflow-hidden">
            <div className="p-5 border-b border-hairline">
                <p className="text-label text-ink-soft">Student progress overrides</p>
                <p className="text-caption text-text-secondary mt-1">
                    For edge cases — a stuck student, a data-entry mistake, whatever needs a human
                    call. Every automatic unlock/mastery check still runs normally; this just lets you
                    step in directly on one student at a time.
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-body-md">
                    <thead>
                        <tr className="border-b border-hairline-strong bg-surface-sunken">
                            <th className="px-4 py-3 text-left text-caption text-text-secondary font-semibold">Student</th>
                            <th className="px-4 py-3 text-left text-caption text-text-secondary font-semibold">Status</th>
                            <th className="px-4 py-3 text-left text-caption text-text-secondary font-semibold">Streak</th>
                            <th className="px-4 py-3 text-left text-caption text-text-secondary font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const rowPending = isPending && pendingStudentId === row.studentId
                            return (
                                <tr key={row.studentId} className="border-b border-hairline last:border-0 align-top">
                                    <td className="px-4 py-3 text-body-emphasis text-ink">{row.studentName}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex items-center rounded-pill px-3 py-1 text-caption font-semibold ${STATUS_BADGE_CLASS[row.status]}`}
                                        >
                                            {STATUS_LABEL[row.status]}
                                        </span>
                                        {!row.hasRealRow && (
                                            <span className="block text-caption text-text-muted mt-1">
                                                default — never attempted
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-ink">
                                        {row.correctStreak} / {masteryThreshold}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            {row.status !== 'unlocked' && (
                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => handleAction(row.studentId, 'unlock')}
                                                    className="relative h-9 px-3 rounded-md before:absolute before:-inset-1 before:content-[''] border-2 border-hairline text-caption font-medium text-ink hover:bg-surface-sunken disabled:opacity-60"
                                                >
                                                    {rowPending ? '…' : 'Unlock'}
                                                </button>
                                            )}
                                            {row.status !== 'locked' && (
                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => handleAction(row.studentId, 'lock')}
                                                    className="relative h-9 px-3 rounded-md before:absolute before:-inset-1 before:content-[''] border-2 border-hairline text-caption font-medium text-ink hover:bg-surface-sunken disabled:opacity-60"
                                                >
                                                    {rowPending ? '…' : 'Lock'}
                                                </button>
                                            )}
                                            {row.status !== 'mastered' && (
                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => handleAction(row.studentId, 'mark_mastered')}
                                                    className="relative h-9 px-3 rounded-md before:absolute before:-inset-1 before:content-[''] border-2 border-brand text-caption font-medium text-brand hover:bg-brand-soft disabled:opacity-60"
                                                >
                                                    {rowPending ? '…' : 'Mark mastered'}
                                                </button>
                                            )}
                                            {row.correctStreak > 0 && (
                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => handleAction(row.studentId, 'reset_streak')}
                                                    className="relative h-9 px-3 rounded-md before:absolute before:-inset-1 before:content-[''] border-2 border-hairline text-caption font-medium text-ink hover:bg-surface-sunken disabled:opacity-60"
                                                >
                                                    {rowPending ? '…' : 'Reset streak'}
                                                </button>
                                            )}
                                        </div>
                                        {errorByStudentId[row.studentId] && (
                                            <p className="text-caption text-error mt-1" role="alert">
                                                {errorByStudentId[row.studentId]}
                                            </p>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
