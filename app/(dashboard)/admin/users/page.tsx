import { requireRole } from '@/lib/auth/get-current-user'
import { listUsers } from '@/features/admin/actions/users'
import { UserList } from '@/features/admin/components/UserList'

// Admin user browsing — one job: search/filter/manage existing
// accounts. Create/Enroll/Reassign live on their own routes.
//
// Design pass: this is data content (a searchable/filterable list),
// so per §7.8 it fills the full container width, not the max-w-3xl
// single-form cap it had before. Removed the bare "• ADMIN" eyebrow
// label — §10's "don't bring back uppercase eyebrows everywhere" from
// the old system applies here; the page title plus its position under
// Admin nav already says what section this is.
export default async function AdminUsersPage() {
    await requireRole(['admin'])

    const users = await listUsers({})

    return (
        <div>
            <h1 className="text-h1 text-ink mb-8">Users</h1>

            <UserList initialUsers={users} />
        </div>
    )
}