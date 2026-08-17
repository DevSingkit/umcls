import { getTeacherDashboardData } from '@/features/dashboard/actions/teacher-dashboard'
import { NeedsAttentionList } from '@/features/dashboard/components/NeedsAttentionList'
import { CoursesPreview } from '@/features/dashboard/components/CoursesPreview'

export default async function TeacherDashboardPage() {
    const { attentionItems, coursesPreview } = await getTeacherDashboardData()

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">Dashboard</h1>

            <CoursesPreview
                courses={coursesPreview}
                courseHrefBase="/teacher/courses"
                emptyMessage="You have not created a course yet. Use the Create button to get started."
                createCourseHref="/teacher/courses/new"
            />

            <div className="mb-10 mt-10">
                <NeedsAttentionList items={attentionItems} />
            </div>
        </div>
    )
}