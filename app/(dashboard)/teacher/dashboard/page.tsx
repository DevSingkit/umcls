import { getTeacherDashboardData } from '@/features/dashboard/actions/teacher-dashboard'
import { NeedsAttentionList } from '@/features/dashboard/components/NeedsAttentionList'
import { LearningInsightsCard } from '@/features/dashboard/components/LearningInsightsCard'
import { CoursesPreview } from '@/features/dashboard/components/CoursesPreview'

// PHASE 4 ADDITION (2026-08-28, continued conversation): LearningInsightsCard
// placed between CoursesPreview and NeedsAttentionList — "orient
// before act," same ordering principle already used on the student
// dashboard (courses first, so you know what class you're in, before
// a task list). Learning insights are a state-of-the-class overview;
// NeedsAttentionList below it is the actionable follow-up list, so
// insights reads naturally as context for what's below it, not after.
//
// DESIGN-LMS 2.1 REDESIGN (2026-08-31): pure visual fix, no logic
// touched — data fetching and layout structure unchanged. Removed
// `font-heading` from the page's h1 — this is a Classroom Mode page;
// Fredoka is Mission-Mode-only. Same fix applied everywhere else in
// this track.
export default async function TeacherDashboardPage() {
    const { attentionItems, coursesPreview, learningInsights } = await getTeacherDashboardData()

    return (
        <div>
            <h1 className="text-h1 text-ink mb-8">Dashboard</h1>

            <CoursesPreview
                courses={coursesPreview}
                courseHrefBase="/teacher/courses"
                emptyMessage="You have not created a course yet. Use the Create button to get started."
                createCourseHref="/teacher/courses/new"
            />

            <div className="mt-10">
                <LearningInsightsCard insights={learningInsights} />
            </div>

            <div className="mb-10 mt-10">
                <NeedsAttentionList items={attentionItems} />
            </div>
        </div>
    )
}
