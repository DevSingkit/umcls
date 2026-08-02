import Link from 'next/link'
import { ClipboardList, HelpCircle } from 'lucide-react'
import type { TodoItem } from '@/features/todo/queries/todo-items'

const ITEM_LABEL: Record<TodoItem['itemType'], string> = {
    assignment: 'Assignment',
    quiz: 'Quiz',
}

// Same fixed icon + color mapping used in CourseStream.tsx and
// TeacherCourseStream.tsx — one mapping, everywhere (DESIGN-LMS.md §8.7a).
const ITEM_ICON: Record<TodoItem['itemType'], typeof ClipboardList> = {
    assignment: ClipboardList,
    quiz: HelpCircle,
}

const ITEM_ICON_BG: Record<TodoItem['itemType'], string> = {
    assignment: 'bg-amber-soft text-amber',
    quiz: 'bg-info-soft text-info',
}

function hrefFor(item: TodoItem) {
    return item.itemType === 'assignment'
        ? `/student/courses/${item.courseId}/assignments/${item.id}`
        : `/student/courses/${item.courseId}/quizzes/${item.id}`
}

// courseNameById lets each row name its source course (§8.6: a
// secondary-list item must always say which course it belongs to —
// "Assignment" alone means nothing once a student has more than one
// course). Passed in rather than fetched here, since the dashboard
// page already loads course names for the courses-preview section;
// no need for TodoList to run its own lookup.
type TodoListProps = {
    items: TodoItem[]
    courseNameById?: Map<string, string>
}

export function TodoList({ items, courseNameById }: TodoListProps) {
    if (items.length === 0) {
        return (
            <div className="bg-surface rounded-md shadow-card p-6 text-center">
                <p className="text-body-md text-text-secondary">You&rsquo;re all caught up! Nothing due right now.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-3">
            {items.map((item) => {
                const isPastDue = item.dueAt ? new Date(item.dueAt).getTime() < Date.now() : false
                const courseName = courseNameById?.get(item.courseId)
                const Icon = ITEM_ICON[item.itemType]

                return (
                    <Link
                        key={`${item.itemType}-${item.id}`}
                        href={hrefFor(item)}
                        className="flex items-start gap-4 rounded-md bg-surface p-4 shadow-card hover:shadow-card-hover"
                    >
                        <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${ITEM_ICON_BG[item.itemType]}`}
                            aria-hidden="true"
                        >
                            <Icon size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-caption text-text-secondary mb-1">
                                {courseName ? `${courseName} · ${ITEM_LABEL[item.itemType]}` : ITEM_LABEL[item.itemType]}
                            </p>
                            <span className="block truncate text-body-emphasis text-ink">{item.title}</span>
                        </div>

                        <div className="shrink-0">
                            {item.dueAt ? (
                                <span className={`text-caption whitespace-nowrap ${isPastDue ? 'text-error' : 'text-text-secondary'}`}>
                                    {isPastDue ? 'Past due — ' : 'Due '}
                                    {new Date(item.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            ) : (
                                <span className="text-caption text-text-secondary whitespace-nowrap">No due date</span>
                            )}
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}
