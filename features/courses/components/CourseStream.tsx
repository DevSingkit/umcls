import Link from 'next/link'
import type { StreamItem } from '@/features/courses/actions/get-course-stream'

const KIND_LABEL: Record<StreamItem['kind'], string> = {
    lesson: 'Lesson',
    quiz: 'Quiz',
    assignment: 'Assignment',
}

function Badge({ tone, children }: { tone: 'success' | 'neutral' | 'info' | 'error'; children: React.ReactNode }) {
    const toneClass = {
        success: 'bg-success-soft text-success',
        neutral: 'bg-hairline text-text-secondary',
        info: 'bg-info-soft text-info',
        error: 'bg-error-soft text-error',
    }[tone]

    return (
        <span className={`inline-flex items-center rounded-pill px-3 py-1 text-caption font-semibold ${toneClass}`}>
            {children}
        </span>
    )
}

function StatusBadge({ item }: { item: StreamItem }) {
    if (item.kind === 'lesson') {
        return item.completed ? (
            <Badge tone="success">Completed</Badge>
        ) : (
            <Badge tone="neutral">Not started</Badge>
        )
    }

    if (item.kind === 'quiz') {
        switch (item.attemptStatus) {
            case 'in_progress':
                return <Badge tone="info">In progress</Badge>
            case 'submitted':
                return <Badge tone="neutral">Submitted</Badge>
            case 'graded':
                return <Badge tone="success">Graded</Badge>
            default:
                return <Badge tone="neutral">Not started</Badge>
        }
    }

    // assignment — submission status takes priority once it exists;
    // due date is only shown for a student who hasn't turned it in yet.
    if (item.submissionStatus === 'graded' || item.submissionStatus === 'returned') {
        return <Badge tone="success">Graded</Badge>
    }
    if (item.submissionStatus === 'resubmitted') {
        return <Badge tone="info">Resubmitted</Badge>
    }
    if (item.submissionStatus === 'submitted') {
        return <Badge tone="neutral">Turned in</Badge>
    }

    if (item.dueAt) {
        const due = new Date(item.dueAt)
        const isPast = due.getTime() < Date.now()
        return (
            <Badge tone={isPast ? 'error' : 'neutral'}>
                {isPast ? 'Past due — turn it in soon' : `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
            </Badge>
        )
    }
    return <Badge tone="neutral">No due date</Badge>
}

function hrefFor(courseId: string, item: StreamItem) {
    switch (item.kind) {
        case 'lesson':
            return `/student/courses/${courseId}/lessons/${item.id}`
        case 'quiz':
            return `/student/courses/${courseId}/quizzes/${item.id}`
        case 'assignment':
            return `/student/courses/${courseId}/assignments/${item.id}`
    }
}

export function CourseStream({ courseId, items }: { courseId: string; items: StreamItem[] }) {
    if (items.length === 0) {
        return (
            <div className="bg-surface rounded-md shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary">
                    Nothing posted here yet.
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {items.map((item) => (
                <Link
                    key={`${item.kind}-${item.id}`}
                    href={hrefFor(courseId, item)}
                    className="bg-surface rounded-md shadow-card p-6 flex items-center justify-between hover:shadow-card-hover"
                >
                    <div>
                        <p className="text-caption text-text-secondary mb-1">
                            {KIND_LABEL[item.kind]}
                        </p>
                        <span className="text-body-emphasis text-ink">{item.title}</span>
                    </div>
                    <StatusBadge item={item} />
                </Link>
            ))}
        </div>
    )
}