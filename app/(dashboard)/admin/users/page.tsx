import Link from 'next/link'
import { UserPlus, UserCheck, ArrowLeftRight, Archive } from 'lucide-react'
import { requireRole } from '@/lib/auth/get-current-user'
import { listUsers } from '@/features/admin/actions/users'
import { UserList } from '@/features/admin/components/UserList'

// Admin user browsing — one job: search/filter/manage existing
// accounts. Create/Enroll/Reassign/Deleted live on their own routes,
// reached via the toolbar row below (previously unreachable except by
// typing the URL directly — see ADAPTIVE-ENGINE-LOG_1_.md for the
// investigation that found this).
//
// DESIGN-LMS 2.1 migration (this pass): full token migration from the
// old v0/DESIGN-LMS-v2.0 system. font-heading removed from h1 (Classroom
// Mode headings default to font-sans/Nunito via globals.css's base
// layer — no class needed). Everything else (text-h1, shadow-card,
// bg-brand-soft, border-hairline, etc.) already matched real 2.1 tokens.
export default async function AdminUsersPage() {
    await requireRole(['admin'])

    const users = await listUsers({})

    const toolbar = [
        { href: '/admin/users/new', icon: UserPlus, label: 'Add account' },
        { href: '/admin/users/enroll', icon: UserCheck, label: 'Enroll' },
        { href: '/admin/users/reassign', icon: ArrowLeftRight, label: 'Reassign' },
        { href: '/admin/users/deleted', icon: Archive, label: 'Deleted' },
    ]

    return (
        <div>
            <h1 className="text-h1 text-ink mb-6">Users</h1>

            {/* Toolbar row — square buttons, one row, matches the dashboard
                shortcut pattern's icon treatment but as equal-weight primary
                actions rather than a description-carrying list. 56px floor
                (h-14) since these are page-level primary actions, not
                secondary/dense-row items. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {toolbar.map((item) => {
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex h-14 flex-col items-center justify-center gap-1 rounded-md border border-hairline bg-surface shadow-card hover:bg-surface-sunken hover:border-hairline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                            <Icon size={20} className="text-brand" aria-hidden="true" />
                            <span className="text-caption text-ink font-semibold">{item.label}</span>
                        </Link>
                    )
                })}
            </div>

            <UserList initialUsers={users} />
        </div>
    )
}
