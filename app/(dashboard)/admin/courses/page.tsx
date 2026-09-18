import { requireRole } from '@/lib/auth/get-current-user'
import { getAllCoursesForManagement } from '@/features/admin/actions/course-management'
import { AdminCourseList } from '@/features/admin/components/AdminCourseList'

export default async function AdminCoursesPage() {
    await requireRole(['admin'])
    const courses = await getAllCoursesForManagement()

    return (
        <div>
            <h1 className="text-h1 text-ink mb-2">Archive classes</h1>
            <p className="text-body-md text-text-secondary mb-8">
                Archive a class to remove it from its teacher and students&apos; dashboards.
            </p>

            <AdminCourseList initialCourses={courses} />
        </div>
    )
}
