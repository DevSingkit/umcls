import Link from 'next/link'
import { FileText, ClipboardList, HelpCircle, Plus } from 'lucide-react'
import type { TeacherStreamItem } from '@/features/courses/actions/get-teacher-course-stream'
import { StreamItemMenu } from '@/features/courses/components/StreamItemMenu'
const TYPE_LABEL: Record<TeacherStreamItem['type'], string> = {
    lesson: 'Lesson',
    quiz: 'Quiz',
    assignment: 'Assignment',
}

// One consistent icon + color mapping per content type, applied everywhere
// this list of types appears (DESIGN-LMS.md §7.4).
const TYPE_ICON: Record<TeacherStreamItem['type'], typeof FileText> = {
    lesson: FileText,
    quiz: HelpCircle,
    assignment: ClipboardList,
}

const TYPE_ICON_BG: Record<TeacherStreamItem['type'], string> = {
    lesson: 'bg-brand-soft text-brand',
    quiz: 'bg-info-soft text-info',
    assignment: 'bg-amber-soft text-amber',
}

function itemHref(courseId: string, item: TeacherStreamItem) {
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
function editHref(courseId: string, item: TeacherStreamItem) {
    switch (item.type) {
        case 'lesson':
            return `/teacher/courses/${courseId}/lessons/${item.id}/edit`
        case 'quiz':
            return `/teacher/courses/${courseId}/quizzes/${item.id}/edit`
        case 'assignment':
            return `/teacher/courses/${courseId}/assignments/${item.id}/edit`
    }
}

export function TeacherCourseStream({
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
                    className="flex h-11 items-center rounded-md bg-brand px-6 text-body-md font-semibold text-on-ink hover:bg-brand-hover"
                >
                    + Create Lesson
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
                {items.map((item) => {
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
                                    <span className="inline-flex items-center rounded-pill bg-amber-soft text-amber text-caption font-semibold px-3 py-1 whitespace-nowrap">
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
