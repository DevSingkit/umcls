// features/dashboard/components/NeedsAttentionList.tsx
// Ungraded assignment submissions + ungraded quiz short-answers +
// students stuck on a mission (Day 5 of the gamified-learning pivot —
// see teacher-dashboard.ts's STUCK_WRONG_ATTEMPTS_THRESHOLD /
// STUCK_STALE_HOURS for what "stuck" means), merged and sorted by most
// recent. Every row names its course (§8.6 rule: a secondary-list item
// must always say which course it belongs to).
// Icon + color mapping per item type matches TodoList.tsx / RecentGrades.tsx
// / CourseStream.tsx (§8.7a) for the original two kinds; mission_stuck
// intentionally breaks from that palette (error/warning instead of
// amber/info) since it's a "this student needs help" signal, not a
// routine grading task.
//
// Renders its own heading + top spacing (mt-8) so this section always
// stands apart from whatever sits above it on the page, rather than
// relying on the parent page to add a gap.
import Link from 'next/link'
import { ClipboardList, HelpCircle, AlertTriangle } from 'lucide-react'
import type { AttentionItem } from '@/features/dashboard/actions/teacher-dashboard'

const ITEM_ICON: Record<AttentionItem['kind'], typeof ClipboardList> = {
    assignment_submission: ClipboardList,
    quiz_short_answer: HelpCircle,
    mission_stuck: AlertTriangle,
}

const ITEM_ICON_BG: Record<AttentionItem['kind'], string> = {
    assignment_submission: 'bg-amber-soft text-amber',
    quiz_short_answer: 'bg-info-soft text-info',
    // Distinct from the other two on purpose — this isn't a routine
    // grading task, it's a "this student needs help" signal, so it
    // gets the error/warning color rather than amber/info.
    mission_stuck: 'bg-error-soft text-error',
}

const ITEM_KIND_LABEL: Record<AttentionItem['kind'], string> = {
    assignment_submission: 'Assignment',
    quiz_short_answer: 'Quiz',
    mission_stuck: 'Mission',
}

const ITEM_CTA_LABEL: Record<AttentionItem['kind'], string> = {
    assignment_submission: 'Grade',
    quiz_short_answer: 'Grade',
    // "Grade" doesn't fit — nothing needs grading here, there's just no
    // dedicated per-student stuck-review page in this app yet, so this
    // links to the mission's edit page as the closest actionable
    // destination.
    mission_stuck: 'Review',
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
    return (
        <div className="mt-8">
            <h2 className="font-heading text-h2 text-ink mb-4">Needs your attention</h2>

            {items.length === 0 ? (
                <div className="border border-dashed border-hairline-strong rounded-md p-6 text-center">
                    <p className="text-body-md text-text-secondary">
                        Nothing needs your attention right now. You&apos;re all caught up.
                    </p>
                </div>
            ) : (
                <div className="bg-surface rounded-md shadow-card divide-y divide-hairline">
                    {items.map((item) => {
                        const Icon = ITEM_ICON[item.kind]

                        return (
                            <div
                                key={`${item.kind}-${item.id}`}
                                className="flex items-center gap-4 p-4 first:rounded-t-md last:rounded-b-md"
                            >
                                <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${ITEM_ICON_BG[item.kind]}`}
                                    aria-hidden="true"
                                >
                                    <Icon size={20} />
                                </div>

                                <Link href={item.href} className="min-w-0 flex-1 hover:underline">
                                    <p className="text-caption text-text-secondary">
                                        {item.courseName} · {ITEM_KIND_LABEL[item.kind]}
                                    </p>
                                    <p className="text-body-emphasis text-ink truncate">
                                        {item.kind === 'mission_stuck'
                                            ? `${item.studentName} is stuck on "${item.title}"`
                                            : `${item.studentName} submitted "${item.title}"`}
                                    </p>
                                </Link>

                                <span className="text-caption text-text-secondary whitespace-nowrap shrink-0">
                                    {timeAgo(item.submittedAt)}
                                </span>

                                <Link
                                    href={item.href}
                                    className="shrink-0 h-9 px-4 inline-flex items-center rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover"
                                >
                                    {ITEM_CTA_LABEL[item.kind]}
                                </Link>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
