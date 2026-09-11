// features/missions/components/MissionList.tsx
//
// Renders the list of missions for a lesson, plus a "New mission"
// link — the Missions-section equivalent of MaterialList on the same
// lesson page. Server component (no interactivity needed here beyond
// links), same as the section it sits in.
//
// PHASE 3.7 FIX (ADAPTIVE-ENGINE-PLAN.md, "Problem A", 2026-08-28):
// the "+ New mission" link used to be a bare text-caption hyperlink —
// visually weaker than the mission cards sitting right above it, the
// exact asymmetry the plan flagged (existing missions get card
// treatment, creating one doesn't). Now a real dashed-border "add"
// card, same footprint/weight as the mission cards it sits below,
// matching a pattern already used elsewhere in the app for "add new
// item" affordances (see e.g. the dashed empty-state box in
// ContinueLearning.tsx) rather than inventing a new visual language.
// No logic changed — still a plain Link to the same /new route.
//
// QUICK-ACCESS BUTTONS (2026-09-06): the whole row used to be one
// giant Link straight to /edit — meant a teacher had to open the full
// edit page (settings, ALL activities, then scroll to the bottom) just
// to check student progress. Row is now a plain div (can't nest a Link
// inside a Link); the title/activity-count block stays a Link to
// /edit for the familiar "click the mission to open it" default, and
// two new explicit buttons — Settings (-> /edit) and Progress (->
// /progress) — sit right after the Posted/Draft badge for a direct
// one-click path to either, no scrolling required.

import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { MissionSummary } from '@/features/missions/actions/create-mission'

export function MissionList({
    missions,
    courseId,
    lessonId,
}: {
    missions: MissionSummary[]
    courseId: string
    lessonId: string
}) {
    return (
        <div className="space-y-3">
            {missions.length === 0 && (
                <p className="text-body-md text-text-secondary">No missions yet for this lesson.</p>
            )}
            {missions.map((mission) => (
                <div
                    key={mission.id}
                    className="flex flex-wrap items-center justify-between gap-3 bg-surface rounded-md border border-hairline shadow-card p-4"
                >
                    <Link
                        href={`/teacher/courses/${courseId}/lessons/${lessonId}/missions/${mission.id}/edit`}
                        className="min-w-0 hover:opacity-80 transition-opacity"
                    >
                        <p className="text-body-emphasis text-ink truncate">{mission.title}</p>
                        <p className="text-caption text-text-secondary">
                            {mission.activityCount} activit{mission.activityCount === 1 ? 'y' : 'ies'}
                        </p>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                        <span
                            className={`text-caption font-semibold px-3 py-1 rounded-pill ${
                                mission.is_published ? 'bg-brand-soft text-brand' : 'bg-surface-sunken text-text-muted'
                            }`}
                        >
                            {mission.is_published ? 'Posted' : 'Draft'}
                        </span>
                        <Link
                            href={`/teacher/courses/${courseId}/lessons/${lessonId}/missions/${mission.id}/edit`}
                            className="h-8 px-3 flex items-center rounded-md border-2 border-hairline text-caption font-medium text-ink hover:bg-surface-sunken transition-colors"
                        >
                            Settings
                        </Link>
                        <Link
                            href={`/teacher/courses/${courseId}/lessons/${lessonId}/missions/${mission.id}/progress`}
                            className="h-8 px-3 flex items-center rounded-md border-2 border-hairline text-caption font-medium text-ink hover:bg-surface-sunken transition-colors"
                        >
                            Progress
                        </Link>
                    </div>
                </div>
            ))}
            <Link
                href={`/teacher/courses/${courseId}/lessons/${lessonId}/missions/new`}
                className="flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-hairline p-4 text-caption font-semibold text-brand hover:border-brand hover:bg-brand-soft transition-colors"
            >
                <Plus size={18} aria-hidden="true" />
                New mission
            </Link>
        </div>
    )
}
