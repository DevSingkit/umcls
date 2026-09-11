import Link from 'next/link'
import { Users, GraduationCap, ClipboardList } from 'lucide-react'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { getWeeklyLoginCounts } from '@/features/admin/actions/dashboard-stats'
import { WeeklyActivityChart } from '@/features/admin/components/WeeklyActivityChart'
import { DashboardAutoRefresh } from '@/features/admin/components/DashboardAutoRefresh'

// Admin home page (PH2-001, full scope). Logic unchanged from session
// two — same three counts, same weekly login query, same removed
// Recent Activity feed (redundant with /admin/audit-logs) and removed
// Users/Enroll nav tabs. This pass only reworks the markup to follow
// DESIGN-LMS.md v2.0 §7.5a (every content area gets one outer surface
// card) and §7.8 (dashboards are full-width data content, not capped).
export default async function AdminDashboardPage() {
    await requireRole(['admin'])
    const supabase = await createClient()

    const [
        { count: teacherCount },
        { count: studentCount },
        { count: courseCount },
        weeklyLogins,
    ] = await Promise.all([
        supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'teacher')
            .is('deleted_at', null),
        supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'student')
            .is('deleted_at', null),
        supabase
            .from('courses')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null),
        getWeeklyLoginCounts(),
    ])

    const shortcuts = [
        {
            href: '/admin/users',
            icon: Users,
            iconBg: 'bg-brand-soft text-brand',
            title: 'Manage accounts',
            description: 'Add, edit, or enroll teachers and students.',
        },
        {
            href: '/admin/grades',
            icon: GraduationCap,
            iconBg: 'bg-info-soft text-info',
            title: 'View scores',
            description: "See every class's scores.",
        },
        {
            href: '/admin/course-activity',
            icon: ClipboardList,
            iconBg: 'bg-warning-soft text-warning',
            title: 'Class activity',
            description: 'Every lesson, quiz, and assignment.',
        },
    ]

    return (
        <div>
            <DashboardAutoRefresh />

            <h1 className="mb-8 text-h1 text-ink">Dashboard</h1>

            {/* Stat cards — 3 max per §8.2, each its own small surface card. */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
                <div className="bg-surface rounded-md shadow-card p-4 sm:p-6">
                    <p className="text-caption text-text-secondary mb-1 sm:mb-2">Teachers</p>
                    <p className="text-data-md sm:text-data-lg text-ink">{teacherCount ?? 0}</p>
                </div>
                <div className="bg-surface rounded-md shadow-card p-4 sm:p-6">
                    <p className="text-caption text-text-secondary mb-1 sm:mb-2">Students</p>
                    <p className="text-data-md sm:text-data-lg text-ink">{studentCount ?? 0}</p>
                </div>
                <div className="bg-surface rounded-md shadow-card p-4 sm:p-6">
                    <p className="text-caption text-text-secondary mb-1 sm:mb-2">Classes</p>
                    <p className="text-data-md sm:text-data-lg text-ink">{courseCount ?? 0}</p>
                </div>
            </div>

            {/* Shortcuts — §7.5a: heading outside on canvas, one outer surface
                card, nested rows inside separated by hairline dividers (same
                density as an 8.7a Stream row) instead of 3 separately
                shadowed cards. Description text stays visible at every size —
                §1 "big, obvious, few" means fewer items, not hidden meaning. */}
            <h2 className="mb-3 text-h3 text-ink">Shortcuts</h2>
            <div className="bg-surface rounded-md shadow-card mb-8 overflow-hidden">
                {shortcuts.map((shortcut, index) => {
                    const Icon = shortcut.icon
                    return (
                        <Link
                            key={shortcut.href}
                            href={shortcut.href}
                            className={`flex items-center gap-4 p-4 sm:p-5 hover:bg-surface-sunken ${
                                index > 0 ? 'border-t border-hairline' : ''
                            }`}
                        >
                            <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${shortcut.iconBg}`}
                            >
                                <Icon size={20} aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-body-emphasis text-ink">{shortcut.title}</p>
                                <p className="text-caption text-text-secondary">{shortcut.description}</p>
                            </div>
                        </Link>
                    )
                })}
            </div>

            <WeeklyActivityChart data={weeklyLogins} />
        </div>
    )
}
