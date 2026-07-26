import { getTeacherDashboardData } from '@/features/dashboard/actions/teacher-dashboard'
import { StatCard } from '@/features/dashboard/components/StatCard'
import { NeedsAttentionList } from '@/features/dashboard/components/NeedsAttentionList'
import { CoursesPreview } from '@/features/dashboard/components/CoursesPreview'

export default async function TeacherDashboardPage() {
    const { stats, attentionItems, coursesPreview } = await getTeacherDashboardData()

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">Welcome back</h1>

            {/* Stat cards — §8.2: 2-4 max, data-lg numbers, no wall of stats */}
            <div className="grid gap-4 sm:grid-cols-3 mb-10">
                <StatCard label="Courses" value={stats.coursesCount} />
                <StatCard label="Students" value={stats.studentsCount} />
                <StatCard label="Needs grading" value={stats.needsGradingCount} />
            </div>

            <div className="mb-10">
                <h2 className="font-heading text-h2 text-ink mb-4">Needs your attention</h2>
                <NeedsAttentionList items={attentionItems} />
            </div>

            <CoursesPreview
                courses={coursesPreview}
                viewAllHref="/teacher/courses"
                courseHrefBase="/teacher/courses"
                emptyMessage="You have not created a course yet. Use the Create button to get started."
            />
        </div>
    )
}
