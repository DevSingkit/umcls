// features/dashboard/components/RecentGrades.tsx
// Assignment + quiz grades merged, most recent first. Every row names
// its course (§8.6). Uses badge-graded coloring (info) per §7.3, since
// this is a grade number, not a pass/fail state.
import Link from 'next/link'
import type { RecentGradeItem } from '@/features/dashboard/actions/student-dashboard'

export function RecentGrades({ items }: { items: RecentGradeItem[] }) {
    if (items.length === 0) {
        return (
            <div className="border border-dashed border-hairline-strong rounded-md p-6 text-center">
                <p className="text-body-md text-text-secondary">
                    No grades yet. They will show up here once your teacher grades your work.
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
                            {item.courseName} · {item.kind === 'quiz' ? 'Quiz' : 'Assignment'}
                        </p>
                        <p className="text-body-emphasis text-ink truncate">{item.title}</p>
                    </div>
                    <span className="inline-flex items-center rounded-pill bg-info-soft text-info text-caption font-semibold px-3 py-1 whitespace-nowrap">
                        {Math.round(item.score)}/{item.maxScore === 100 ? 100 : item.maxScore}
                    </span>
                </Link>
            ))}
        </div>
    )
}
