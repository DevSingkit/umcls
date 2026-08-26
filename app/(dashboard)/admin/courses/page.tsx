import { requireRole } from '@/lib/auth/get-current-user'
import { getAllCoursesForManagement } from '@/features/admin/actions/course-management'
import { AdminCourseList } from '@/features/admin/components/AdminCourseList'

// Admin course archiving — one job. Restoring deleted user accounts
// moved to its own route (/admin/users/deleted) — see
// LOGIC-REBUILD-PLAN.md G2. This page no longer fetches deleted users,
// since nothing on it needs them anymore.
//
// Design pass: this is data content (a list to scan), so per §7.8 it
// fills the full AppShell width rather than being capped like a form
// page. Previously capped at max-w-3xl, which is the form-page width —
// wrong pattern for a list. The heading now sits outside on canvas per
// §7.5a; AdminCourseList itself already wraps its rows correctly.
export default async function AdminCoursesPage() {
    await requireRole(['admin'])
    const courses = await getAllCoursesForManagement()

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-2">Archive classes</h1>
            <p className="text-body-md text-text-secondary mb-8">
                Archive a class to remove it from its teacher and students&apos; dashboards.
            </p>

            <AdminCourseList initialCourses={courses} />
        </div>
    )
}