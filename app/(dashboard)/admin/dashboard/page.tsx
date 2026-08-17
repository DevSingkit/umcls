import Link from 'next/link'
import { Users, GraduationCap, ClipboardList } from 'lucide-react'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { getWeeklyLoginCounts } from '@/features/admin/actions/dashboard-stats'
import { WeeklyActivityChart } from '@/features/admin/components/WeeklyActivityChart'
import { DashboardAutoRefresh } from '@/features/admin/components/DashboardAutoRefresh'

// Admin home page (PH2-001, full scope). The count cards and links
// below are unchanged from session two. Weekly login graph added on
// top. Recent Activity feed removed (2026-08-02) — the school admin
// flagged it as redundant with the full /admin/audit-logs page, and
// the Users/Enroll nav tabs were removed the same day for the same
// reason (both already reachable via the cards below).
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

    return (
        <div>
            <DashboardAutoRefresh />

            <h1 className="mb-8 font-heading text-h1 text-ink">Dashboard</h1>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
                <div className="bg-surface rounded-md shadow-card p-3 sm:p-6">
                    <p className="text-caption sm:text-label text-text-secondary mb-1 sm:mb-2">Teachers</p>
                    <p className="text-body-emphasis sm:text-data-lg text-ink">{teacherCount ?? 0}</p>
                </div>
                <div className="bg-surface rounded-md shadow-card p-3 sm:p-6">
                    <p className="text-caption sm:text-label text-text-secondary mb-1 sm:mb-2">Students</p>
                    <p className="text-body-emphasis sm:text-data-lg text-ink">{studentCount ?? 0}</p>
                </div>
                <div className="bg-surface rounded-md shadow-card p-3 sm:p-6">
                    <p className="text-caption sm:text-label text-text-secondary mb-1 sm:mb-2">Classes</p>
                    <p className="text-body-emphasis sm:text-data-lg text-ink">{courseCount ?? 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
                <Link
                    href="/admin/users"
                    className="bg-surface rounded-md shadow-card p-3 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left hover:bg-surface-sunken"
                >
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                        <Users size={16} className="sm:hidden" aria-hidden="true" />
                        <Users size={20} className="hidden sm:block" aria-hidden="true" />
                    </div>
                    <div>
                        <span className="text-caption sm:text-body-emphasis text-ink block sm:mb-1">Manage accounts</span>
                        <span className="hidden sm:block text-caption text-text-secondary">Add, edit, or enroll teachers and students.</span>
                    </div>
                </Link>
                <Link
                    href="/admin/grades"
                    className="bg-surface rounded-md shadow-card p-3 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left hover:bg-surface-sunken"
                >
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-md bg-info-soft text-info">
                        <GraduationCap size={16} className="sm:hidden" aria-hidden="true" />
                        <GraduationCap size={20} className="hidden sm:block" aria-hidden="true" />
                    </div>
                    <div>
                        <span className="text-caption sm:text-body-emphasis text-ink block sm:mb-1">View grades</span>
                        <span className="hidden sm:block text-caption text-text-secondary">See every classes&apos; grades.</span>
                    </div>
                </Link>
                <Link
                    href="/admin/course-activity"
                    className="bg-surface rounded-md shadow-card p-3 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left hover:bg-surface-sunken"
                >
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-md bg-amber-soft text-amber">
                        <ClipboardList size={16} className="sm:hidden" aria-hidden="true" />
                        <ClipboardList size={20} className="hidden sm:block" aria-hidden="true" />
                    </div>
                    <div>
                        <span className="text-caption sm:text-body-emphasis text-ink block sm:mb-1">Class activity</span>
                        <span className="hidden sm:block text-caption text-text-secondary">Every lesson, quiz, and assignment.</span>
                    </div>
                </Link>
            </div>

            <div className="mb-10">
                <WeeklyActivityChart data={weeklyLogins} />
            </div>
        </div>
    )
}