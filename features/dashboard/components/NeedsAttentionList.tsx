// features/dashboard/components/NeedsAttentionList.tsx
// Ungraded assignment submissions + ungraded quiz short-answers, merged
// and sorted by most recent. Every row names its course (§8.6 rule: a
// secondary-list item must always say which course it belongs to).
import Link from 'next/link'
import type { AttentionItem } from '@/features/dashboard/actions/teacher-dashboard'

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
            <div className="border border-dashed border-hairline-strong rounded-md p-6 text-center">
                <p className="text-body-md text-text-secondary">
                    Nothing needs grading right now. You're all caught up.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-surface rounded-md shadow-card divide-y divide-hairline">
            {items.map((item) => (
                <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-surface-sunken first:rounded-t-md last:rounded-b-md"
                >
                    <div className="min-w-0">
                        <p className="text-caption text-text-secondary">
                            {item.courseName} · {item.kind === 'quiz_short_answer' ? 'Quiz' : 'Assignment'}
                        </p>
                        <p className="text-body-emphasis text-ink truncate">
                            {item.studentName} submitted "{item.title}"
                        </p>
                    </div>
                    <span className="text-caption text-text-secondary whitespace-nowrap">
                        {timeAgo(item.submittedAt)}
                    </span>
                </Link>
            ))}
        </div>
    )
}
