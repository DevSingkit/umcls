import { requireRole } from '@/lib/auth/get-current-user'
import { getCourseActivityForAdmin } from '@/features/admin/actions/course-activity'
import { CourseActivityAccordion } from '@/features/admin/components/CourseActivityAccordion'

// Admin, read-only activity view grouped by course. Reached from a
// dashboard card, not a nav tab — admin nav is intentionally at 3
// tabs, see HANDOFF.md §7. Data content per §7.8, full width, no
// change needed to width/wrapper here (was already unwrapped and
// full-width, unlike Courses/Users which had incorrect form-width caps).
export default async function AdminCourseActivityPage() {
    await requireRole(['admin'])
    const courses = await getCourseActivityForAdmin()

    return (
        <div>
            <h1 className="mb-2 text-h1 text-ink">Class Activities</h1>
            <p className="mb-8 text-body-md text-text-secondary">
                Every lesson, quiz, and assignment, by class. Click a class to expand it.
            </p>

            <CourseActivityAccordion courses={courses} />
        </div>
    )
}
