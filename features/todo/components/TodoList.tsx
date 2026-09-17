// features/todo/components/TodoList.tsx
//
// Encapsulated Card Architecture & Expandable Pill Pattern:
// Renders to-do tasks as interactive Google Classroom ExpandablePills.
// Clicking toggles an inline drawer with task details and an open action button.
import Link from 'next/link'
import { ClipboardList, HelpCircle } from 'lucide-react'
import type { TodoItem } from '@/features/todo/queries/todo-items'
import { ExpandablePill } from '@/components/ui/ExpandablePill'

const ITEM_LABEL: Record<TodoItem['itemType'], string> = {
    assignment: 'Assignment',
    quiz: 'Quiz',
}

const ITEM_ICON: Record<TodoItem['itemType'], typeof ClipboardList> = {
    assignment: ClipboardList,
    quiz: HelpCircle,
}

const ITEM_ICON_BG: Record<TodoItem['itemType'], string> = {
    assignment: 'bg-warning-soft text-warning',
    quiz: 'bg-info-soft text-info',
}

function hrefFor(item: TodoItem) {
    return item.itemType === 'assignment'
        ? `/student/courses/${item.courseId}/assignments/${item.id}`
        : `/student/courses/${item.courseId}/quizzes/${item.id}`
}

type TodoListProps = {
    items: TodoItem[]
    courseNameById?: Map<string, string>
}

export function TodoList({ items, courseNameById }: TodoListProps) {
    if (items.length === 0) {
        return (
            <div className="border border-dashed border-hairline-strong rounded-md p-8 text-center bg-surface-sunken/20">
                <p className="font-sans text-body-md text-text-secondary">
                    You&rsquo;re all caught up! Nothing due right now.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {items.map((item) => {
                const isPastDue = item.dueAt ? new Date(item.dueAt).getTime() < Date.now() : false
                const courseName = courseNameById?.get(item.courseId)
                const Icon = ITEM_ICON[item.itemType]

                const formattedDue = item.dueAt
                    ? (isPastDue ? 'Past due — ' : 'Due ') +
                      new Date(item.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : 'No due date'

                return (
                    <ExpandablePill
                        key={`${item.itemType}-${item.id}`}
                        icon={<Icon size={18} />}
                        iconClassName={ITEM_ICON_BG[item.itemType]}
                        title={item.title}
                        courseBadge={courseName}
                        statusBadge={
                            <span className="inline-flex items-center rounded-pill bg-surface-sunken px-2.5 py-0.5 text-caption font-semibold text-ink-soft">
                                {ITEM_LABEL[item.itemType]}
                            </span>
                        }
                        metadata={
                            <span className={isPastDue ? 'text-error font-semibold' : 'text-text-secondary'}>
                                {formattedDue}
                            </span>
                        }
                        actions={
                            <Link
                                href={hrefFor(item)}
                                className="inline-flex items-center justify-center min-h-touch-secondary px-5 rounded-md bg-brand text-on-ink text-body-sm font-semibold hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-colors"
                            >
                                Open {ITEM_LABEL[item.itemType]} →
                            </Link>
                        }
                    >
                        <div className="text-body-md text-text-secondary space-y-1">
                            <p>
                                <strong className="font-semibold text-ink">{item.title}</strong>
                                {courseName && <span> · {courseName}</span>}
                            </p>
                            <p className="text-caption text-text-secondary">
                                Status: {isPastDue ? <span className="text-error font-semibold">Overdue</span> : 'Assigned'}. Click the action below to open and submit your work.
                            </p>
                        </div>
                    </ExpandablePill>
                )
            })}
        </div>
    )
}
