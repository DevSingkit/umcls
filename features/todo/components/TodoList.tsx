import Link from 'next/link'
import type { TodoItem } from '@/features/todo/queries/todo-items'

const ITEM_LABEL: Record<TodoItem['itemType'], string> = {
    assignment: 'Assignment',
    quiz: 'Quiz',
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
                return (
                    <Link
                        key={`${item.itemType}-${item.id}`}
                        href={hrefFor(item)}
                        className="bg-surface rounded-md shadow-card p-5 flex items-center justify-between hover:shadow-card-hover"
                    >
                        <div>
                            <p className="text-caption text-text-secondary mb-1">
                                {courseName ? `${courseName} · ${ITEM_LABEL[item.itemType]}` : ITEM_LABEL[item.itemType]}
                            </p>
                            <span className="text-body-emphasis text-ink">{item.title}</span>
                        </div>
                        {item.dueAt ? (
                            <span className={`text-caption ${isPastDue ? 'text-error' : 'text-text-secondary'}`}>
                                {isPastDue ? 'Past due — ' : 'Due '}
                                {new Date(item.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                        ) : (
                            <span className="text-caption text-text-secondary">No due date</span>
                        )}
                    </Link>
                )
            })}
        </div>
    )
}
