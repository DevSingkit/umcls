import { requireRole } from '@/lib/auth/get-current-user'
import { getMyTodoItems, getMyDoneItems } from '@/features/todo/queries/todo-items'
import { getMyEnrolledCourses } from '@/features/courses/actions/get-enrolled-courses'
import { TodoTabs } from '@/features/todo/components/TodoTabs'

// Full To-do page — Assigned/Missing/Done, matching real Google
// Classroom's actual structure (confirmed via research, not assumed).
// The dashboard's TodoList preview links here via "View all".
export default async function StudentTodoPage() {
    await requireRole(['student'])

    const [todoItems, doneItems, courses] = await Promise.all([
        getMyTodoItems(),
        getMyDoneItems(),
        getMyEnrolledCourses(),
    ])

    const courseNameById = new Map((courses ?? []).map((c: any) => [c.id, c.title]))

    return (
        <div>
            <h1 className="text-h1 text-ink mb-8">To-do</h1>
            <TodoTabs todoItems={todoItems} doneItems={doneItems} courseNameById={courseNameById} />
        </div>
    )
}
