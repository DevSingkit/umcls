// features/dashboard/components/MasteredMissions.tsx
//
// Phase 3.6 (ADAPTIVE-ENGINE-PLAN.md): a second dashboard section,
// separate from ContinueLearning.tsx — this one is optional, for-fun
// replay of missions the student has already mastered, grouped by
// course per the user's original sketch (e.g. English → "Story of
// Frozen", Mathematics → "Learn Addition").
//
// Visual treatment deliberately distinct from ContinueLearning's cards
// (confirmed against tailwind.config.ts): brand/brand-soft (the
// design system's success-green pair) with a trophy icon and "Replay"
// label — a "you did it, come have fun" feel — vs. ContinueLearning's
// amber/info "you still need to do this" feel. Not using amber here
// on purpose: Phase 3.5 already uses amber for "needs practice," and
// reusing it here for "mastered" would make the same color mean two
// contradictory things across the dashboard.
//
// Tapping a card links to the SAME mission route ContinueLearning
// uses — no separate "replay mode" URL. submitActivityAttempt already
// detects replay server-side from mission_progress.status ===
// 'mastered', so nothing special needs to be passed from here.
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { MasteredMissionsByCourse } from '@/features/dashboard/actions/get-mastered-missions'

export function MasteredMissions({ groups }: { groups: MasteredMissionsByCourse[] }) {
    if (groups.length === 0) {
        // No dashed empty-state box here on purpose, unlike
        // ContinueLearning's empty state — "nothing mastered yet" is
        // the normal, expected state for a brand-new student, not
        // something worth a prominent empty-state callout. Simplest
        // fix if this section should just not render at all yet: the
        // parent page can check groups.length before rendering the
        // section heading too.
        return null
    }

    return (
        <div className="space-y-6">
            {groups.map((group) => (
                <div key={group.courseId}>
                    <p className="text-caption text-text-secondary mb-2">{group.courseName}</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {group.missions.map((mission) => (
                            <Link
                                key={mission.missionId}
                                href={`/student/courses/${group.courseId}/lessons/${mission.lessonId}/missions/${mission.missionId}`}
                                className="bg-surface rounded-md shadow-card p-6 block hover:shadow-card-hover border border-brand-soft"
                            >
                                <p className="text-body-emphasis text-ink">{mission.missionTitle}</p>
                                <span className="text-caption font-semibold text-brand bg-brand-soft rounded-pill px-3 py-1 mt-2 inline-flex items-center gap-1">
                                    <Trophy size={14} aria-hidden="true" />
                                    Replay
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
