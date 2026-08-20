import { requireRole } from '@/lib/auth/get-current-user'
import { getAllCoursesForManagement } from '@/features/admin/actions/course-management'
import { getAllDeletedUsers } from '@/features/admin/actions/users'
import { AdminCourseList } from '@/features/admin/components/AdminCourseList'
import { DeletedUsersList } from '@/features/admin/components/DeletedUsersList'

// Admin course management: archive/unarchive any course. Archiving is
// admin-only by design (migration 059) — teachers never see an archive
// control on their own courses, only the resulting "Archived" nav
// destination once one of theirs has been archived.
//
// 2026-08-17: also lists deleted user accounts here, with Restore.
// "Erase User Data" (features/admin/actions/erase-user.ts) is now a
// reversible soft delete — nothing in this app permanently destroys
// data anymore, per requirement. This is where any deleted account
// can be found and brought back.
export default async function AdminCoursesPage() {
    await requireRole(['admin'])
    const [courses, deletedUsers] = await Promise.all([
        getAllCoursesForManagement(),
        getAllDeletedUsers(),
    ])

    return (
        <div className="min-h-screen bg-canvas">
            <div className="mx-auto max-w-3xl space-y-12">
                <div>
                    <h1 className="text-h1 text-ink mt-2">Archives</h1>
                    <p className="text-body-md text-text-secondary mt-2">
                        Archive a class to remove it from its
                        teacher and students&apos; dashboards, or restore a deleted account.
                    </p>
                </div>

                <div>
                    <h2 className="text-body-emphasis text-ink mb-4">Classes</h2>
                    <AdminCourseList initialCourses={courses} />
                </div>

                <div>
                    <h2 className="text-body-emphasis text-ink mb-4">Deleted accounts</h2>
                    <DeletedUsersList initialUsers={deletedUsers} />
                </div>
            </div>
        </div>
    )
}
