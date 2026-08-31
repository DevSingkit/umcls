// features/dashboard/components/ContinueLearning.tsx
// One card per enrolled course, pointing at that course's next
// not-yet-completed lesson. Every card names its course (§8.6).
//
// PHASE 3.5 REWORK: a card now points at a MISSION (with a small
// reason badge) whenever item.mission is present — see
// student-dashboard.ts's top-of-file note for exactly when that is.
// item.mission === null falls back to the original lesson-card
// rendering, byte-identical to before, for non-gamified courses.
import Link from 'next/link'
import type { ContinueLearningItem, ContinueLearningReason } from '@/features/dashboard/actions/student-dashboard'

const REASON_LABEL: Record<ContinueLearningReason, string> = {
    new: 'New mission',
    in_progress: 'Keep going',
    needs_practice: 'Needs practice',
}

const REASON_BADGE_CLASS: Record<ContinueLearningReason, string> = {
    new: 'text-info bg-info-soft',
    in_progress: 'text-brand bg-brand-soft',
    needs_practice: 'text-amber bg-amber-soft',
}

export function ContinueLearning({ items }: { items: ContinueLearningItem[] }) {
    if (items.length === 0) {
        return (
            <div className="border border-dashed border-hairline-strong rounded-md p-6 text-center">
                <p className="text-body-md text-text-secondary">
                    You have finished every lesson so far. Nice work!
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
                const href = item.mission
                    ? `/student/courses/${item.courseId}/lessons/${item.lessonId}/missions/${item.mission.id}`
                    : `/student/courses/${item.courseId}/lessons/${item.lessonId}`

                return (
                    <Link
                        key={item.courseId}
                        href={href}
                        className="bg-surface rounded-md shadow-card p-6 block hover:shadow-card-hover"
                    >
                        <p className="text-caption text-text-secondary">{item.courseName}</p>
                        <p className="text-body-emphasis text-ink mt-1">
                            {item.mission ? item.mission.title : item.lessonTitle}
                        </p>
                        {item.mission ? (
                            <span
                                className={`text-caption font-semibold rounded-pill px-3 py-1 mt-2 inline-block ${REASON_BADGE_CLASS[item.mission.reason]}`}
                            >
                                {REASON_LABEL[item.mission.reason]}
                            </span>
                        ) : (
                            <span className="text-caption text-brand mt-2 inline-block">Continue lesson</span>
                        )}
                    </Link>
                )
            })}
        </div>
    )
}
