import Link from 'next/link'
import { getStudentDashboardData } from '@/features/dashboard/actions/student-dashboard'
import { getMyTodoItems } from '@/features/todo/queries/todo-items'
import { TodoList } from '@/features/todo/components/TodoList'
import { ContinueLearning } from '@/features/dashboard/components/ContinueLearning'
import { CoursesPreview } from '@/features/dashboard/components/CoursesPreview'

// Student home page. Order follows §8.6: orient before act. Courses
// preview comes first so a student sees what class they're in before
// being handed a task list; To-Do and Continue Learning sit together
// after that. Recent Grades section removed per design review
// (predates this pass); RecentGrades.tsx itself and its backing
// computation in student-dashboard.ts are now deleted, not just
// unrendered — confirmed unused anywhere else before removing.
//
// To-Do preview now shows only the first 3 items + "View all" link to
// the full /student/todo page (Assigned/Missing/Done tabs), per
// REBUILD-PLAN.md's Phase 1 checklist — previously rendered the full
// unfiltered list here.
export default async function StudentDashboardPage() {
    const [{ continueLearning, coursesPreview, courseNameById }, todoItems] = await Promise.all([
        getStudentDashboardData(),
        getMyTodoItems(),
    ])

    const todoPreview = todoItems.slice(0, 3)

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">Dashboard</h1>

            <div className="mb-10">
                <CoursesPreview
                    courses={coursesPreview}
                    courseHrefBase="/student/courses"
                    emptyMessage="You are not enrolled in any course yet. Ask your school admin to add you."
                />
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="order-2 lg:order-1">
                    <h2 className="font-heading text-h2 text-ink mb-4">Continue learning</h2>
                    <ContinueLearning items={continueLearning} />
                </div>

                <div className="order-1 lg:order-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-heading text-h2 text-ink">To-Do</h2>
                        {todoItems.length > 0 && (
                            <Link href="/student/todo" className="text-caption font-semibold text-brand hover:underline">
                                View all
                            </Link>
                        )}
                    </div>
                    <TodoList items={todoPreview} courseNameById={courseNameById} />
                </div>
            </div>
        </div>
    )
}
