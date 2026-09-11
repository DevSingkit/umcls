import Link from 'next/link'
import { Play, Star } from 'lucide-react'
import type { StreamItem } from '@/features/courses/actions/get-course-stream'
import { AnnouncementCard } from '@/features/courses/components/AnnouncementCard'
import { MaterialList } from '@/features/materials/components/MaterialList'
import { LessonStreamComments } from '@/features/lessons/components/LessonStreamComments'
import { Avatar } from '@/components/ui/Avatar'
import { getCurrentUser } from '@/lib/auth/get-current-user'

const KIND_LABEL: Record<Exclude<StreamItem['kind'], 'announcement'>, string> = {
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

// Lesson cards get an inline preview — description, attachments, and
// missions progress right in the stream — instead of forcing a click
// through to the full lesson page just to see what's in it. The title
// itself stays a Link to that full page (LessonReader.tsx, comments,
// etc. still only live there); everything below it is a plain div, not
// nested inside a Link, since MaterialList and the Practice button are
// themselves clickable and can't sit inside an <a>.
function LessonCard({
    courseId,
    item,
    currentUserId,
}: {
    courseId: string
    item: Extract<StreamItem, { kind: 'lesson' }>
    currentUserId: string
}) {
    const lessonHref = hrefFor(courseId, item)
    const hasMissions = item.missions.total > 0
    const allMissionsMastered = hasMissions && item.missions.practiceMissionId === null

    return (
        <div className="rounded-md bg-surface p-4 shadow-card hover:shadow-card-hover">
            <div className="flex items-start gap-4">
                <Avatar fullName={item.authorName} avatarUrl={item.authorAvatarUrl} size="md" />

                <div className="min-w-0 flex-1">
                    <p className="text-body-emphasis text-ink truncate">{item.authorName}</p>
                    <p className="text-caption font-semibold text-text-secondary">
                        {KIND_LABEL.lesson} ·{' '}
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                    <Link href={lessonHref} className="block truncate text-body-md font-semibold text-ink hover:underline mt-1">
                        {item.title}
                    </Link>
                </div>

                <div className="shrink-0">
                    <StatusBadge item={item} />
                </div>
            </div>

            {item.description && (
                <p className="text-body-md text-ink-soft whitespace-pre-wrap mt-3 pl-[60px]">
                    {item.description}
                </p>
            )}

            {item.materials.length > 0 && (
                <div className="mt-3 pl-[60px]">
                    <MaterialList materials={item.materials} />
                </div>
            )}

            {hasMissions && (
                <div className="mt-3 pl-[60px] flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-4 py-3">
                    <p className="text-caption font-semibold text-text-secondary">
                        {item.missions.masteredCount} / {item.missions.total} mission
                        {item.missions.total === 1 ? '' : 's'} mastered
                    </p>
                    {allMissionsMastered ? (
                        <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-warning">
                            <Star size={16} fill="currentColor" aria-hidden="true" />
                            All mastered
                        </span>
                    ) : (
                        <Link
                            href={`/student/courses/${courseId}/lessons/${item.id}/missions/${item.missions.practiceMissionId}`}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover transition-colors"
                        >
                            <Play size={14} fill="currentColor" aria-hidden="true" />
                            {item.missions.masteredCount > 0 ? 'Continue' : 'Practice'}
                        </Link>
                    )}
                </div>
            )}

            <LessonStreamComments
                lessonId={item.id}
                comments={item.comments}
                currentUserId={currentUserId}
                isTeacher={false}
            />
        </div>
    )
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

    const user = await getCurrentUser()

    return (
        <div className="grid gap-3">
            {items.map((item) => {
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

                if (item.kind === 'lesson') {
                    return (
                        <LessonCard
                            key={`lesson-${item.id}`}
                            courseId={courseId}
                            item={item}
                            currentUserId={user?.id ?? ''}
                        />
                    )
                }

                return (
                    <Link
                        key={`${item.kind}-${item.id}`}
                        href={hrefFor(courseId, item)}
                        className="flex items-start gap-4 rounded-md bg-surface p-4 shadow-card hover:shadow-card-hover"
                    >
                        <Avatar fullName={item.authorName} avatarUrl={item.authorAvatarUrl} size="md" />

                        <div className="min-w-0 flex-1">
                            <p className="text-body-emphasis text-ink truncate">{item.authorName}</p>
                            <p className="text-caption font-semibold text-text-secondary">
                                {KIND_LABEL[item.kind]} ·{' '}
                                {new Date(item.createdAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </p>
                            <span className="block truncate text-body-md text-ink mt-1">
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
