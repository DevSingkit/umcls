import Link from 'next/link'
import { FileText, ClipboardList, HelpCircle } from 'lucide-react'
import type { StreamItem } from '@/features/courses/actions/get-course-stream'
import { AnnouncementCard } from '@/features/courses/components/AnnouncementCard'
import { getCurrentUser } from '@/lib/auth/get-current-user'

// PHASE 3.8: 'announcement' intentionally has no entry in KIND_LABEL/
// KIND_ICON/KIND_ICON_BG below — those three maps only cover the
// three kinds that render through the shared icon+title+badge Link
// card. Announcement items never reach that rendering path at all
// (see the early-return special case in the component below), so
// omitting it here is deliberate, not an oversight — TypeScript would
// flag a genuinely missing case if any of these maps were used
// against an announcement item.
const KIND_LABEL: Record<Exclude<StreamItem['kind'], 'announcement'>, string> = {
    lesson: 'Lesson',
    quiz: 'Quiz',
    assignment: 'Assignment',
}

// Same fixed icon + color mapping as TeacherCourseStream.tsx — one mapping,
// used everywhere a lesson/quiz/assignment type is shown (DESIGN-LMS.md §8.7a).
const KIND_ICON: Record<Exclude<StreamItem['kind'], 'announcement'>, typeof FileText> = {
    lesson: FileText,
    quiz: HelpCircle,
    assignment: ClipboardList,
}

const KIND_ICON_BG: Record<Exclude<StreamItem['kind'], 'announcement'>, string> = {
    lesson: 'bg-brand-soft text-brand',
    quiz: 'bg-info-soft text-info',
    assignment: 'bg-warning-soft text-warning',
}

function Badge({ tone, children }: { tone: 'success' | 'neutral' | 'info' | 'error'; children: React.ReactNode }) {
    const toneClass = {
        success: 'bg-success-soft text-success',
        neutral: 'bg-hairline text-text-secondary',
        info: 'bg-info-soft text-info',
        error: 'bg-error-soft text-error',
    }[tone]

    return (
        <span className={`inline-flex items-center rounded-pill px-3 py-1 text-caption font-semibold whitespace-nowrap ${toneClass}`}>
            {children}
        </span>
    )
}

function StatusBadge({ item }: { item: Exclude<StreamItem, { kind: 'announcement' }> }) {
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

function hrefFor(courseId: string, item: Exclude<StreamItem, { kind: 'announcement' }>) {
    switch (item.kind) {
        case 'lesson':
            return `/student/courses/${courseId}/lessons/${item.id}`
        case 'quiz':
            return `/student/courses/${courseId}/quizzes/${item.id}`
        case 'assignment':
            return `/student/courses/${courseId}/assignments/${item.id}`
    }
}

export async function CourseStream({ courseId, items }: { courseId: string; items: StreamItem[] }) {
    if (items.length === 0) {
        return (
            <div className="bg-surface rounded-md shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary">
                    Nothing posted here yet.
                </p>
            </div>
        )
    }

    // PHASE 3.8: fetched here rather than added as a new required prop
    // — this component's existing callers (the student course page)
    // weren't available to update in this session, so changing the
    // exported prop signature risked silently breaking that call site.
    // Fetching internally keeps CourseStream's own public interface
    // exactly as it was.
    const user = await getCurrentUser()

    return (
        <div className="grid gap-3">
            {items.map((item) => {
                // PHASE 3.8: announcements render as a completely
                // different card (AnnouncementCard) — no icon+title+
                // badge Link, no navigation, body text inline with a
                // comment thread. Confirmed with user this needed a
                // genuinely different shape, not a new icon/color
                // added to the existing mapping.
                if (item.kind === 'announcement') {
                    return (
                        <AnnouncementCard
                            key={`announcement-${item.id}`}
                            announcement={item}
                            currentUserId={user?.id ?? ''}
                            isTeacher={false}
                        />
                    )
                }

                const Icon = KIND_ICON[item.kind]

                return (
                    <Link
                        key={`${item.kind}-${item.id}`}
                        href={hrefFor(courseId, item)}
                        className="flex items-start gap-4 rounded-md bg-surface p-4 shadow-card hover:shadow-card-hover"
                    >
                        <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${KIND_ICON_BG[item.kind]}`}
                            aria-hidden="true"
                        >
                            <Icon size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-caption font-semibold text-text-secondary">
                                {KIND_LABEL[item.kind]}
                            </p>
                            <span className="block truncate text-body-emphasis text-ink">
                                {item.title}
                            </span>
                        </div>

                        <div className="shrink-0">
                            <StatusBadge item={item} />
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}
