// Shows the 10 most recent audit log entries in plain terms. This is
// meant to be read at a glance, not analyzed, so action codes like
// AUTH_LOGIN or USER_DEACTIVATED get turned into short plain sentences
// instead of showing raw database action strings.
import type { RecentAuditLogRow } from '@/features/admin/actions/dashboard-stats'

function describeAction(row: RecentAuditLogRow): string {
    const who = row.actor_role ? row.actor_role : 'Someone'
    switch (row.action) {
        case 'AUTH_LOGIN':
            return `${who} logged in`
        case 'AUTH_LOGIN_FAILED':
            return `Failed login attempt`
        case 'AUTH_LOGIN_RATE_LIMITED':
            return `Too many login attempts blocked`
        case 'USER_DEACTIVATED':
            return `${who} deactivated an account`
        case 'USER_REACTIVATED':
            return `${who} reactivated an account`
        case 'USER_PASSWORD_RESET':
            return `${who} reset a password`
        case 'USER_CREATED':
            return `${who} created a new account`
        case 'COURSE_TEACHER_ASSIGNED':
            return `${who} assigned a teacher to a course`
        default:
            // Fall back to a readable version of the raw action code,
            // rather than hiding unknown actions entirely.
            return `${who}: ${row.action.replaceAll('_', ' ').toLowerCase()}`
    }
}

function formatWhen(createdAt: string): string {
    const date = new Date(createdAt)
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

export function RecentActivityFeed({ rows }: { rows: RecentAuditLogRow[] }) {
    return (
        <div className="bg-surface rounded-md shadow-card p-6">
            <p className="text-label uppercase tracking-wide text-text-secondary mb-4">
                Recent activity
            </p>
            {rows.length === 0 ? (
                <p className="text-body-md text-text-secondary">Nothing to show yet.</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {rows.map((row) => (
                        <li key={row.id} className="flex items-center justify-between gap-4">
                            <span className="text-body-md text-ink">{describeAction(row)}</span>
                            <span className="text-caption text-text-secondary whitespace-nowrap">
                                {formatWhen(row.created_at)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}