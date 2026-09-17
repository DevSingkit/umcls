// features/dashboard/components/ContinueLearning.tsx
//
// Encapsulated Card Architecture: Encapsulated within SectionCard.
// Points at that course's next not-yet-completed lesson or mission.
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import type { ContinueLearningItem, ContinueLearningReason } from '@/features/dashboard/actions/student-dashboard'
import { SectionCard } from '@/components/ui/SectionCard'

const REASON_LABEL: Record<ContinueLearningReason, string> = {
    new: 'New mission',
    in_progress: 'Keep going',
    needs_practice: 'Needs practice',
}

const REASON_BADGE_CLASS: Record<ContinueLearningReason, string> = {
    new: 'text-info bg-info-soft',
    in_progress: 'text-brand bg-brand-soft',
    needs_practice: 'text-warning bg-warning-soft',
}

export function ContinueLearning({ items }: { items: ContinueLearningItem[] }) {
    if (items.length === 0) {
        return (
            <SectionCard title="Continue learning" badge={0}>
                <div className="border border-dashed border-hairline-strong rounded-md p-8 text-center bg-surface-sunken/20">
                    <p className="text-body-md text-text-secondary">
                        You have finished every lesson so far. Nice work!
                    </p>
                </div>
            </SectionCard>
        )
    }

    return (
        <SectionCard
            title="Continue learning"
            badge={items.length}
            subtitle="Pick up where you left off"
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => {
                    const href = item.mission
                        ? `/student/courses/${item.courseId}/lessons/${item.lessonId}/missions/${item.mission.id}`
                        : `/student/courses/${item.courseId}/lessons/${item.lessonId}`

                    return (
                        <Link
                            key={item.courseId}
                            href={href}
                            className="bg-surface rounded-md border border-hairline p-5 block hover:shadow-card hover:border-brand transition-all"
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <BookOpen size={16} className="text-brand shrink-0" aria-hidden="true" />
                                <p className="text-caption font-semibold text-text-secondary truncate">{item.courseName}</p>
                            </div>
                            <p className="text-body-emphasis text-ink">
                                {item.mission ? item.mission.title : item.lessonTitle}
                            </p>
                            <div className="mt-3">
                                {item.mission ? (
                                    <span
                                        className={`text-caption font-semibold rounded-pill px-3 py-1 inline-block ${REASON_BADGE_CLASS[item.mission.reason]}`}
                                    >
                                        {REASON_LABEL[item.mission.reason]}
                                    </span>
                                ) : (
                                    <span className="text-caption font-semibold text-brand hover:underline inline-block">
                                        Continue lesson →
                                    </span>
                                )}
                            </div>
                        </Link>
                    )
                })}
            </div>
        </SectionCard>
    )
}
