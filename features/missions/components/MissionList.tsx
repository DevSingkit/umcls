// features/missions/components/MissionList.tsx
//
// Renders the list of missions for a lesson, plus a "New mission"
// link — the Missions-section equivalent of MaterialList on the same
// lesson page. Server component (no interactivity needed here beyond
// links), same as the section it sits in.

import Link from 'next/link'
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
                <Link
                    key={mission.id}
                    href={`/teacher/courses/${courseId}/lessons/${lessonId}/missions/${mission.id}/edit`}
                    className="flex items-center justify-between gap-4 bg-surface rounded-md border border-hairline shadow-card p-4 hover:border-brand transition-colors"
                >
                    <div>
                        <p className="text-body-emphasis text-ink">{mission.title}</p>
                        <p className="text-caption text-text-secondary">
                            {mission.activityCount} activit{mission.activityCount === 1 ? 'y' : 'ies'}
                        </p>
                    </div>
                    <span
                        className={`shrink-0 text-caption font-semibold px-3 py-1 rounded-pill ${
                            mission.is_published ? 'bg-brand-soft text-brand' : 'bg-surface-sunken text-text-muted'
                        }`}
                    >
                        {mission.is_published ? 'Posted' : 'Draft'}
                    </span>
                </Link>
            ))}
            <Link
                href={`/teacher/courses/${courseId}/lessons/${lessonId}/missions/new`}
                className="inline-block text-caption font-semibold text-brand hover:underline"
            >
                + New mission
            </Link>
        </div>
    )
}
