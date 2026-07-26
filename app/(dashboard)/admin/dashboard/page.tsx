import Link from 'next/link'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { getWeeklyLoginCounts, getRecentAuditLogs } from '@/features/admin/actions/dashboard-stats'
import { WeeklyActivityChart } from '@/features/admin/components/WeeklyActivityChart'
import { RecentActivityFeed } from '@/features/admin/components/RecentActivityFeed'
import { DashboardAutoRefresh } from '@/features/admin/components/DashboardAutoRefresh'

// Admin home page (PH2-001, full scope). The count cards and links
// below are unchanged from session two. Added on top: a weekly login
// graph, a recent activity feed, and auto refresh every 60 seconds.
export default async function AdminDashboardPage() {
    await requireRole(['admin'])
    const supabase = await createClient()

    const [
        { count: teacherCount },
        { count: studentCount },
        { count: courseCount },
        weeklyLogins,
        recentActivity,
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
        getRecentAuditLogs(),
    ])

    return (
        <div>
            <DashboardAutoRefresh />

            <h1 className="text-h1 text-ink mb-8">Admin Dashboard</h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-surface rounded-md shadow-card p-6">
                    <p className="text-label uppercase tracking-wide text-text-secondary mb-2">Teachers</p>
                    <p className="text-data-lg text-ink">{teacherCount ?? 0}</p>
                </div>
                <div className="bg-surface rounded-md shadow-card p-6">
                    <p className="text-label uppercase tracking-wide text-text-secondary mb-2">Students</p>
                    <p className="text-data-lg text-ink">{studentCount ?? 0}</p>
                </div>
                <div className="bg-surface rounded-md shadow-card p-6">
                    <p className="text-label uppercase tracking-wide text-text-secondary mb-2">Courses</p>
                    <p className="text-data-lg text-ink">{courseCount ?? 0}</p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mb-8">
                <WeeklyActivityChart data={weeklyLogins} />
                <RecentActivityFeed rows={recentActivity} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Link
                    href="/admin/users"
                    className="bg-surface rounded-md shadow-card p-6 block hover:bg-surface-sunken"
                >
                    <span className="text-body-emphasis text-ink block mb-1">Create an account</span>
                    <span className="text-caption text-text-secondary">Add a new teacher or student login.</span>
                </Link>
                <Link
                    href="/admin/enroll"
                    className="bg-surface rounded-md shadow-card p-6 block hover:bg-surface-sunken"
                >
                    <span className="text-body-emphasis text-ink block mb-1">Enroll a student</span>
                    <span className="text-caption text-text-secondary">Add a student to one of the school&apos;s courses.</span>
                </Link>
            </div>
        </div>
    )
}