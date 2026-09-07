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

import { Fragment, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Lightbulb, RotateCcw, Clock } from 'lucide-react'
import {
    overrideMissionProgress,
    resetQuestionMastery,
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
    analytics,
}: {
    missionId: string
    rows: MissionProgressOverrideRow[]
    masteryThreshold: number
    analytics: { totalPendingFlags: number; studentsWithFlags: number; modelTrainingExamples: number }
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [pendingStudentId, setPendingStudentId] = useState<string | null>(null)
    const [errorByStudentId, setErrorByStudentId] = useState<Record<string, string>>({})
    // THESIS ML COMPONENT (2026-09-06): separate pending/error tracking
    // for the per-question reset action — it's a different unit
    // (snapshot, not student) and can be fired independently of the
    // existing per-student override actions above.
    const [resettingSnapshotId, setResettingSnapshotId] = useState<string | null>(null)
    const [resetErrorBySnapshotId, setResetErrorBySnapshotId] = useState<Record<string, string>>({})

    function handleResetQuestion(studentId: string, questionId: string, snapshotId: string) {
        setResetErrorBySnapshotId((prev) => ({ ...prev, [snapshotId]: '' }))
        setResettingSnapshotId(snapshotId)
        startTransition(async () => {
            const result = await resetQuestionMastery(missionId, studentId, questionId)
            if (!result.ok) {
                setResetErrorBySnapshotId((prev) => ({ ...prev, [snapshotId]: result.error }))
                setResettingSnapshotId(null)
                return
            }
            router.refresh()
            setResettingSnapshotId(null)
        })
    }

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
        <div className="space-y-4">
            {/* THESIS ML COMPONENT (2026-09-06): simple, mission-wide
                summary — deliberately just three plain numbers with a
                one-line explanation each, not a chart or dashboard.
                modelTrainingExamples is the SHARED model's total across
                every mission/student (see migration 102 — one global
                model), not scoped to this mission alone; the other two
                numbers ARE scoped to this mission. */}
            <div className="bg-surface rounded-md border border-hairline shadow-card p-5">
                <p className="text-label text-ink-soft mb-3">Mastery check-in signals</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-md border border-hairline p-3">
                        <p className="text-data-md text-ink">{analytics.totalPendingFlags}</p>
                        <p className="text-caption text-text-secondary mt-1">
                            questions flagged as possibly shaky, this mission
                        </p>
                    </div>
                    <div className="rounded-md border border-hairline p-3">
                        <p className="text-data-md text-ink">{analytics.studentsWithFlags}</p>
                        <p className="text-caption text-text-secondary mt-1">students with at least one flag</p>
                    </div>
                    <div className="rounded-md border border-hairline p-3">
                        <p className="text-data-md text-ink">{analytics.modelTrainingExamples}</p>
                        <p className="text-caption text-text-secondary mt-1">
                            real cases the model has learned from so far, across all missions
                        </p>
                    </div>
                </div>
            </div>

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
                                    <Fragment key={row.studentId}>
                                        <tr className="border-b border-hairline last:border-0 align-top">
                                            <td className="px-4 py-3 text-body-emphasis text-ink">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {row.studentName}
                                                    {row.flaggedQuestions.length > 0 && (
                                                        <span
                                                            className="inline-flex items-center gap-1 rounded-pill bg-warning-soft text-warning px-2 py-0.5 text-caption font-semibold"
                                                            title="May need a check-in"
                                                        >
                                                            <AlertTriangle size={12} aria-hidden="true" />
                                                            {row.flaggedQuestions.length}
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
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
                                        {/* THESIS ML COMPONENT (2026-09-06): flagged-question detail row —
                                            only rendered when this student has at least one pending flag.
                                            Each question gets its own real action (Reset), not just a
                                            passive indicator. */}
                                        {row.flaggedQuestions.length > 0 && (
                                            <tr className="border-b border-hairline last:border-0 bg-warning-soft/30">
                                                <td colSpan={4} className="px-4 py-3">
                                                    <div className="space-y-2">
                                                        {row.flaggedQuestions.map((fq) => {
                                                            const resetPending = isPending && resettingSnapshotId === fq.snapshotId
                                                            return (
                                                                <div
                                                                    key={fq.snapshotId}
                                                                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-surface rounded-md border border-hairline p-3"
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-body-md text-ink font-medium truncate">
                                                                            {fq.questionPrompt}
                                                                        </p>
                                                                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-secondary mt-1">
                                                                            <span className="inline-flex items-center gap-1">
                                                                                <Lightbulb size={12} aria-hidden="true" />
                                                                                {fq.hintUses} hint{fq.hintUses === 1 ? '' : 's'}
                                                                            </span>
                                                                            <span className="inline-flex items-center gap-1">
                                                                                <RotateCcw size={12} aria-hidden="true" />
                                                                                {fq.wrongCount} wrong before mastering
                                                                            </span>
                                                                            <span className="inline-flex items-center gap-1">
                                                                                <Clock size={12} aria-hidden="true" />
                                                                                {Math.round(fq.daysSincePractice)}d gap before mastering
                                                                            </span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="shrink-0">
                                                                        <button
                                                                            type="button"
                                                                            disabled={isPending}
                                                                            onClick={() =>
                                                                                handleResetQuestion(row.studentId, fq.questionId, fq.snapshotId)
                                                                            }
                                                                            className="h-9 px-3 rounded-md border-2 border-warning text-caption font-medium text-warning hover:bg-warning-soft disabled:opacity-60 whitespace-nowrap"
                                                                        >
                                                                            {resetPending ? '…' : 'Reset — let them re-earn it'}
                                                                        </button>
                                                                        {resetErrorBySnapshotId[fq.snapshotId] && (
                                                                            <p className="text-caption text-error mt-1" role="alert">
                                                                                {resetErrorBySnapshotId[fq.snapshotId]}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
