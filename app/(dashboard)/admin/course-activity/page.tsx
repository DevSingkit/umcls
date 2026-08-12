import { requireRole } from '@/lib/auth/get-current-user'
import { getCourseActivityForAdmin } from '@/features/admin/actions/course-activity'
import { CourseActivityAccordion } from '@/features/admin/components/CourseActivityAccordion'

// Admin, read-only activity view grouped by course. Reached from a
// dashboard card (see admin/dashboard/page.tsx), not a nav tab — admin
// nav is intentionally at 3 tabs, see HANDOFF.md §7.
export default async function AdminCourseActivityPage() {
    await requireRole(['admin'])
    const courses = await getCourseActivityForAdmin()

    return (
        <div>
            <h1 className="mb-2 font-heading text-h1 text-ink">Class Activities</h1>
            <p className="mb-8 text-body-md text-text-secondary">
                Every lesson, quiz, and assignment, by class. Click a class to expand it.
            </p>

            <CourseActivityAccordion courses={courses} />
        </div>
    )
}
