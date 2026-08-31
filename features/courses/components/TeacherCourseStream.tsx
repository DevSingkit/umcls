import Link from 'next/link'
import { FileText, ClipboardList, HelpCircle, Plus } from 'lucide-react'
import type { TeacherStreamItem, TeacherStreamContentItem } from '@/features/courses/actions/get-teacher-course-stream'
import { StreamItemMenu } from '@/features/courses/components/StreamItemMenu'
import { AnnouncementCard } from '@/features/courses/components/AnnouncementCard'
import { getCurrentUser } from '@/lib/auth/get-current-user'

const TYPE_LABEL: Record<TeacherStreamContentItem['type'], string> = {
    lesson: 'Lesson',
    quiz: 'Quiz',
    assignment: 'Assignment',
}

// One consistent icon + color mapping per content type, applied everywhere
// this list of types appears (DESIGN-LMS.md §7.4).
const TYPE_ICON: Record<TeacherStreamContentItem['type'], typeof FileText> = {
    lesson: FileText,
    quiz: HelpCircle,
    assignment: ClipboardList,
}

// DESIGN-LMS 2.1: bg-amber-soft/text-amber -> bg-warning-soft/
// text-warning. `amber` is a dead token from the OLD v1.0
// tailwind.config.ts — the current config only has `warning`/
// `warning-soft` for this same color, so this class was silently not
// applying (no icon background/color rendering at all).
const TYPE_ICON_BG: Record<TeacherStreamContentItem['type'], string> = {
    lesson: 'bg-brand-soft text-brand',
    quiz: 'bg-info-soft text-info',
    assignment: 'bg-warning-soft text-warning',
}

function itemHref(courseId: string, item: TeacherStreamContentItem) {
    switch (item.type) {
        case 'lesson':
            return `/teacher/courses/${courseId}/lessons/${item.id}`
        case 'quiz':
            return `/teacher/courses/${courseId}/quizzes/${item.id}/edit`
        case 'assignment':
            return `/teacher/courses/${courseId}/assignments/${item.id}`
    }
}

// Separate from itemHref (which the title links to — a view/detail
// page for lessons and assignments). This is what the ⋮ menu's Edit
// item links to — a dedicated edit form, distinct from the view page.
function editHref(courseId: string, item: TeacherStreamContentItem) {
    switch (item.type) {
        case 'lesson':
            return `/teacher/courses/${courseId}/lessons/${item.id}/edit`
        case 'quiz':
            return `/teacher/courses/${courseId}/quizzes/${item.id}/edit`
        case 'assignment':
            return `/teacher/courses/${courseId}/assignments/${item.id}/edit`
    }
}

export async function TeacherCourseStream({
    courseId,
    items,
}: {
    courseId: string
    items: TeacherStreamItem[]
}) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-md bg-surface p-10 text-center shadow-card">
                <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-brand-soft">
                    <Plus size={28} className="text-brand" aria-hidden="true" />
                </div>
                <p className="text-body-md text-ink-soft">
                    No lessons, quizzes, or assignments here yet.
                </p>
                <Link
                    href={`/teacher/courses/${courseId}/lessons/new`}
                    className="flex h-12 items-center rounded-md bg-brand px-6 text-body-md font-semibold text-on-ink hover:bg-brand-hover"
                >
                    + Create Lesson
                </Link>
            </div>
        )
    }

    // PHASE 3.8: same reasoning as CourseStream.tsx's identical
    // addition — fetched internally rather than as a new required prop,
    // since this component's own props stay exactly as they were.
    const user = await getCurrentUser()

    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
                {items.map((item) => {
                    // PHASE 3.8: announcements get the same different
                    // card as the student side — no icon+title+badge
                    // row, no StreamItemMenu (that menu's Edit/Delete
                    // actions are built around the lesson/quiz/
                    // assignment RPC-dispatch mechanism in
                    // delete-stream-item.ts, which deliberately does
                    // NOT cover announcements — see get-teacher-course-
                    // stream.ts's TeacherStreamItemType note). Deletion
                    // for an announcement is AnnouncementCard's own
                    // inline "Delete" button instead.
                    if (item.type === 'announcement') {
                        return (
                            <li key={`announcement-${item.id}`}>
                                <AnnouncementCard
                                    announcement={item}
                                    currentUserId={user?.id ?? ''}
                                    isTeacher={true}
                                />
                            </li>
                        )
                    }

                    const Icon = TYPE_ICON[item.type]

                    return (
                        <li
                            key={`${item.type}-${item.id}`}
                            className="flex items-start gap-4 rounded-md bg-surface p-4 shadow-card hover:shadow-card-hover"
                        >
                            <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${TYPE_ICON_BG[item.type]}`}
                                aria-hidden="true"
                            >
                                <Icon size={20} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-caption font-semibold text-text-secondary">
                                    {TYPE_LABEL[item.type]}
                                </p>
                                <Link
                                    href={itemHref(courseId, item)}
                                    className="block truncate text-body-emphasis text-ink hover:underline"
                                >
                                    {item.title}
                                </Link>
                                {item.type === 'assignment' && item.dueAt && (
                                    <p className="text-caption text-text-secondary">
                                        Due {new Date(item.dueAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                                {!!item.ungradedCount && item.ungradedCount > 0 && (
                                    <span className="inline-flex items-center rounded-pill bg-info-soft text-info text-caption font-semibold px-3 py-1 whitespace-nowrap">
                                        {item.ungradedCount} to grade
                                    </span>
                                )}
                                {item.type !== 'lesson' && !item.isPublished && (
                                    <span className="inline-flex items-center rounded-pill bg-warning-soft text-warning text-caption font-semibold px-3 py-1 whitespace-nowrap">
                                        Not posted
                                    </span>
                                )}
                                <StreamItemMenu
                                    type={item.type}
                                    itemId={item.id}
                                    itemTitle={item.title}
                                    editHref={editHref(courseId, item)}
                                />
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
