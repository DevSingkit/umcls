import { requireRole } from '@/lib/auth/get-current-user'
import { getAllCoursesForManagement } from '@/features/admin/actions/course-management'
import { AdminCourseList } from '@/features/admin/components/AdminCourseList'

// Admin course management: archive/unarchive any course. Archiving is
// admin-only by design (migration 059) — teachers never see an archive
// control on their own courses, only the resulting "Archived" nav
// destination once one of theirs has been archived.
export default async function AdminCoursesPage() {
    await requireRole(['admin'])
    const courses = await getAllCoursesForManagement()

    return (
        <div className="min-h-screen bg-canvas px-md py-xxl">
            <div className="mx-auto max-w-3xl space-y-8">
                <div>
                    <p className="text-label uppercase tracking-wide text-text-secondary">• ADMIN</p>
                    <h1 className="text-h1 text-ink mt-2">Courses</h1>
                    <p className="text-body-md text-text-secondary mt-2">
                        Archive a course to remove it from its teacher and students&apos; dashboards
                        without deleting anything. They can still open it from their own
                        &quot;Archived&quot; list.
                    </p>
                </div>

                <AdminCourseList initialCourses={courses} />
            </div>
        </div>
    )
}
