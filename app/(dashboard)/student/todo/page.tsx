import { requireRole } from '@/lib/auth/get-current-user'
import { getMyTodoItems, getMyDoneItems } from '@/features/todo/queries/todo-items'
import { getMyEnrolledCourses } from '@/features/courses/actions/get-enrolled-courses'
import { TodoTabs } from '@/features/todo/components/TodoTabs'
import { SectionCard } from '@/components/ui/SectionCard'

export default async function StudentTodoPage() {
    await requireRole(['student'])

    const [todoItems, doneItems, courses] = await Promise.all([
        getMyTodoItems(),
        getMyDoneItems(),
        getMyEnrolledCourses(),
    ])

    const courseNameById = new Map((courses ?? []).map((c: any) => [c.id, c.title]))

    return (
        <div className="space-y-6">
            <SectionCard
                title="To-do"
                badge={todoItems.length > 0 ? todoItems.length : undefined}
            >
                <TodoTabs todoItems={todoItems} doneItems={doneItems} courseNameById={courseNameById} />
            </SectionCard>
        </div>
    )
}
