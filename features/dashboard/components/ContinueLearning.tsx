// features/dashboard/components/ContinueLearning.tsx
// One card per enrolled course, pointing at that course's next
// not-yet-completed lesson. Every card names its course (§8.6).
import Link from 'next/link'
import type { ContinueLearningItem } from '@/features/dashboard/actions/student-dashboard'

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
            {items.map((item) => (
                <Link
                    key={item.courseId}
                    href={`/student/courses/${item.courseId}/lessons/${item.lessonId}`}
                    className="bg-surface rounded-md shadow-card p-6 block hover:shadow-card-hover border-l-4 border-brand"
                >
                    <p className="text-caption text-text-secondary">{item.courseName}</p>
                    <p className="text-body-emphasis text-ink mt-1">{item.lessonTitle}</p>
                    <span className="text-caption text-brand mt-2 inline-block">Continue lesson</span>
                </Link>
            ))}
        </div>
    )
}
