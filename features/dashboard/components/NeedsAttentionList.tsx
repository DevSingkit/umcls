// features/dashboard/components/NeedsAttentionList.tsx
//
// Encapsulated Card Architecture: Replaced loose outer <h2> with SectionCard,
// and converted flat table rows to Google Classroom ExpandablePill items.
//
// Clicking any row expands inline inside the card, showing task details
// and a direct Grade/Review action button.
import Link from 'next/link'
import { ClipboardList, HelpCircle, AlertTriangle } from 'lucide-react'
import type { AttentionItem } from '@/features/dashboard/actions/teacher-dashboard'
import { SectionCard } from '@/components/ui/SectionCard'
import { ExpandablePill } from '@/components/ui/ExpandablePill'

const ITEM_ICON: Record<AttentionItem['kind'], typeof ClipboardList> = {
    assignment_submission: ClipboardList,
    quiz_short_answer: HelpCircle,
    mission_stuck: AlertTriangle,
}

const ITEM_ICON_BG: Record<AttentionItem['kind'], string> = {
    assignment_submission: 'bg-warning-soft text-warning',
    quiz_short_answer: 'bg-info-soft text-info',
    mission_stuck: 'bg-error-soft text-error',
}

const ITEM_KIND_LABEL: Record<AttentionItem['kind'], string> = {
    assignment_submission: 'Assignment Submission',
    quiz_short_answer: 'Quiz Short Answer',
    mission_stuck: 'Stuck on Mission',
}

const ITEM_CTA_LABEL: Record<AttentionItem['kind'], string> = {
    assignment_submission: 'Grade submission',
    quiz_short_answer: 'Review answer',
    mission_stuck: 'Inspect mission',
}

function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
}

export function NeedsAttentionList({ items }: { items: AttentionItem[] }) {
    if (items.length === 0) {
        return (
            <SectionCard title="Needs your attention" badge={0}>
                <div className="border border-dashed border-hairline-strong rounded-md p-8 text-center bg-surface-sunken/20">
                    <p className="text-body-md text-text-secondary">
                        Nothing needs your attention right now. You&apos;re all caught up!
                    </p>
                </div>
            </SectionCard>
        )
    }

    return (
        <SectionCard
            title="Needs your attention"
            badge={items.length}
            subtitle="Student submissions and learners needing assistance"
        >
            <div className="space-y-3">
                {items.map((item) => {
                    const Icon = ITEM_ICON[item.kind]
                    const titleText =
                        item.kind === 'mission_stuck'
                            ? `${item.studentName} is stuck on "${item.title}"`
                            : `${item.studentName} turned in "${item.title}"`

                    return (
                        <ExpandablePill
                            key={`${item.kind}-${item.id}`}
                            icon={<Icon size={18} />}
                            iconClassName={ITEM_ICON_BG[item.kind]}
                            title={titleText}
                            courseBadge={item.courseName}
                            statusBadge={
                                <span className="inline-flex items-center rounded-pill bg-surface-sunken px-2.5 py-0.5 text-caption font-semibold text-ink-soft">
                                    {ITEM_KIND_LABEL[item.kind]}
                                </span>
                            }
                            metadata={timeAgo(item.submittedAt)}
                            actions={
                                <Link
                                    href={item.href}
                                    className="inline-flex items-center justify-center min-h-touch-secondary px-5 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover transition-colors"
                                >
                                    {ITEM_CTA_LABEL[item.kind]} →
                                </Link>
                            }
                        >
                            <div className="text-body-md text-text-secondary space-y-1">
                                <p>
                                    <strong className="font-semibold text-ink">{item.studentName}</strong> in{' '}
                                    <span className="text-ink">{item.courseName}</span>
                                </p>
                                {item.kind === 'mission_stuck' ? (
                                    <p className="text-caption text-error">
                                        This student has encountered repeated difficulty on this quest. Review their response
                                        pattern or provide guidance.
                                    </p>
                                ) : (
                                    <p className="text-caption text-text-secondary">
                                        Submitted {timeAgo(item.submittedAt)}. Open the grading interface to view their
                                        attached work and assign a mark.
                                    </p>
                                )}
                            </div>
                        </ExpandablePill>
                    )
                })}
            </div>
        </SectionCard>
    )
}
