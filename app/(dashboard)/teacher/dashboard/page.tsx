import { getTeacherDashboardData } from '@/features/dashboard/actions/teacher-dashboard'
import { NeedsAttentionList } from '@/features/dashboard/components/NeedsAttentionList'
import { LearningInsightsCard } from '@/features/dashboard/components/LearningInsightsCard'
import { CoursesPreview } from '@/features/dashboard/components/CoursesPreview'

export default async function TeacherDashboardPage() {
    const { attentionItems, coursesPreview, learningInsights } = await getTeacherDashboardData()

    return (
        <div className="space-y-8">
            <CoursesPreview
                courses={coursesPreview}
                courseHrefBase="/teacher/courses"
                emptyMessage="You have not created a course yet. Use the Create button to get started."
                createCourseHref="/teacher/courses/new"
            />

            <LearningInsightsCard insights={learningInsights} />

            <NeedsAttentionList items={attentionItems} />
        </div>
    )
}
