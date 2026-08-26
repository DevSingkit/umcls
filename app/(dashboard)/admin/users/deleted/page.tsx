import { requireRole } from '@/lib/auth/get-current-user'
import { getAllDeletedUsers } from '@/features/admin/actions/users'
import { DeletedUsersList } from '@/features/admin/components/DeletedUsersList'

// One job: restore a deleted (soft-deleted) account. Lives under
// /admin/users since restoring an account is a user-management job.
//
// Design pass: this is a list (data content), so per §7.8 it fills
// the full container width, not max-w-3xl. Dropped the eyebrow and
// redundant wrapper, same as Users/Courses/Grades above.
export default async function AdminDeletedUsersPage() {
    await requireRole(['admin'])
    const deletedUsers = await getAllDeletedUsers()

    return (
        <div>
            <h1 className="text-h1 text-ink mb-2">Deleted accounts</h1>
            <p className="text-body-md text-text-secondary mb-8">
                Restore an account that was previously erased.
            </p>

            <DeletedUsersList initialUsers={deletedUsers} />
        </div>
    )
}