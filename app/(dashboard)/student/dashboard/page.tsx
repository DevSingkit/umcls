import Link from 'next/link'
import { getStudentDashboardData } from '@/features/dashboard/actions/student-dashboard'
import { getMasteredMissionsForStudent } from '@/features/dashboard/actions/get-mastered-missions'
import { getMyTodoItems } from '@/features/todo/queries/todo-items'
import { TodoList } from '@/features/todo/components/TodoList'
import { ContinueLearning } from '@/features/dashboard/components/ContinueLearning'
import { MasteredMissions } from '@/features/dashboard/components/MasteredMissions'
import { CoursesPreview } from '@/features/dashboard/components/CoursesPreview'
import { SectionCard } from '@/components/ui/SectionCard'

export default async function StudentDashboardPage() {
    const [{ continueLearning, coursesPreview, courseNameById }, masteredGroups, todoItems] = await Promise.all([
        getStudentDashboardData(),
        getMasteredMissionsForStudent(),
        getMyTodoItems(),
    ])

    const todoPreview = todoItems.slice(0, 5)

    return (
        <div className="space-y-8">
            <CoursesPreview
                courses={coursesPreview}
                courseHrefBase="/student/courses"
                emptyMessage="You are not enrolled in any course yet. Ask your school admin to add you."
            />

            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
                <div className="order-2 lg:order-1 space-y-8">
                    <ContinueLearning items={continueLearning} />

                    {masteredGroups.length > 0 && (
                        <MasteredMissions groups={masteredGroups} />
                    )}
                </div>

                <div className="order-1 lg:order-2">
                    <SectionCard
                        title="To-Do"
                        badge={todoItems.length > 0 ? todoItems.length : undefined}
                        action={
                            todoItems.length > 0 ? (
                                <Link
                                    href="/student/todo"
                                    className="text-caption font-semibold text-brand hover:underline"
                                >
                                    View all
                                </Link>
                            ) : undefined
                        }
                    >
                        <TodoList items={todoPreview} courseNameById={courseNameById} />
                    </SectionCard>
                </div>
            </div>
        </div>
    )
}
