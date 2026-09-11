'use server'
// Admin dashboard stats for PH2-001: the weekly login graph and the
// small "last 10 audit log entries" feed. Both are read-only.
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type DailyLoginCount = {
    date: string // YYYY-MM-DD
    label: string // short weekday label, e.g. "Mon"
    count: number
}

// Returns one row per day for the last 7 days (including today), each
// with how many logins happened that day. Always returns all 7 days,
// even if a day had zero logins, so the graph never looks broken or
// incomplete just because nobody logged in on a weekend.
export async function getWeeklyLoginCounts(): Promise<DailyLoginCount[]> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const days: DailyLoginCount[] = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
        const day = new Date(now)
        day.setDate(day.getDate() - i)
        const dateStr = day.toISOString().slice(0, 10)
        const label = day.toLocaleDateString('en-US', { weekday: 'short' })
        days.push({ date: dateStr, label, count: 0 })
    }

    const rangeStart = new Date(now)
    rangeStart.setDate(rangeStart.getDate() - 6)
    rangeStart.setHours(0, 0, 0, 0)

    const { data } = await supabase
        .from('login_events')
        .select('created_at')
        .gte('created_at', rangeStart.toISOString())

    for (const row of data ?? []) {
        const dateStr = new Date(row.created_at).toISOString().slice(0, 10)
        const match = days.find((d) => d.date === dateStr)
        if (match) {
            match.count += 1
        }
    }

    return days
}

export type RecentAuditLogRow = {
    id: number
    actor_role: string | null
    action: string
    created_at: string
}

// Small read-only feed of the 10 most recent audit log entries, for
// the dashboard. Not paginated or filtered, that's what the full
// /admin/audit-logs page (PH2-004) is for.
export async function getRecentAuditLogs(): Promise<RecentAuditLogRow[]> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data } = await supabase
        .from('audit_logs')
        .select('id, actor_role, action, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

    return data ?? []
}
