'use server'
// Read-only audit log query for admins (PH2-004). audit_logs itself has
// NO insert/update/delete policy for anyone except log_audit_event()
// (security definer) — see 019_rls_policies.sql's comment on that table.
// This file only ever selects.
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 25

export type AuditLogRow = {
    id: number
    actor_id: string | null
    actor_role: string | null
    actor_name: string | null
    action: string
    metadata: Record<string, unknown>
    created_at: string
}

// Raw shape returned by the Supabase query below, before we flatten the
// embedded users relation into actor_name.
type AuditLogQueryRow = {
    id: number
    actor_id: string | null
    actor_role: string | null
    action: string
    metadata: Record<string, unknown>
    created_at: string
    users: { full_name: string; email: string } | { full_name: string; email: string }[] | null
}

function toAuditLogRow(row: AuditLogQueryRow): AuditLogRow {
    const user = Array.isArray(row.users) ? row.users[0] : row.users
    const { users, ...rest } = row
    return {
        ...rest,
        actor_name: user?.full_name ?? null,
    }
}

export type AuditLogFilters = {
    page?: number
    actorId?: string
    actionType?: string
    dateFrom?: string
    dateTo?: string
}

export type AuditLogPage = {
    rows: AuditLogRow[]
    totalCount: number
    page: number
    totalPages: number
}

// Returns one page of audit log entries, optionally filtered by actor,
// action type, and/or date range. Admin-only — courses_select_admin's
// sibling policy, audit_logs_select, already enforces this at the RLS
// layer too, this is the app-side check per AUTH_NOTES.md.
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogPage> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const page = Math.max(1, filters.page ?? 1)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
        .from('audit_logs')
        .select(
            'id, actor_id, actor_role, action, metadata, created_at, users:actor_id(full_name, email)',
            { count: 'exact' }
        )
        .order('created_at', { ascending: false })

    if (filters.actorId) {
        query = query.eq('actor_id', filters.actorId)
    }
    if (filters.actionType) {
        query = query.eq('action', filters.actionType)
    }
    if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
    }
    if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
    }

    const { data, count } = await query.range(from, to)

    const totalCount = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

    return {
        rows: ((data as AuditLogQueryRow[] | null) ?? []).map(toAuditLogRow),
        totalCount,
        page,
        totalPages,
    }
}

// Distinct actors who appear in the audit log, for the actor filter
// dropdown. Small table scan is fine at pilot-school scale; revisit if
// audit_logs grows large enough for this to matter.
export async function getAuditLogActors() {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data } = await supabase
        .from('audit_logs')
        .select('actor_id, users:actor_id(full_name, email)')
        .not('actor_id', 'is', null)

    const seen = new Map<string, { id: string; label: string }>()
    for (const row of data ?? []) {
        const actorId = row.actor_id as string
        const user = (row as any).users
        if (actorId && !seen.has(actorId)) {
            seen.set(actorId, {
                id: actorId,
                label: user ? `${user.full_name} (${user.email})` : actorId,
            })
        }
    }
    return Array.from(seen.values())
}

// Distinct action types that appear in the log, for the action filter.
export async function getAuditLogActionTypes() {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data } = await supabase.from('audit_logs').select('action')
    const unique = Array.from(new Set((data ?? []).map((row) => row.action)))
    return unique.sort()
}
