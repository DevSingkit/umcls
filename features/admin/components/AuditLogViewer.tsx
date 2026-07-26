'use client'
// Filterable, paginated, read-only audit log view (PH2-004). No edit
// or delete controls anywhere in this file — audit_logs is immutable
// by design (see audit_logs_immutable trigger, 017_triggers.sql §7.9).
import { useEffect, useState, useTransition, useCallback } from 'react'
import { getAuditLogs, type AuditLogRow } from '@/features/admin/actions/audit-logs'

export function AuditLogViewer({
    initialData,
    actors,
    actionTypes,
}: {
    initialData: { rows: AuditLogRow[]; totalCount: number; page: number; totalPages: number }
    actors: { id: string; label: string }[]
    actionTypes: string[]
}) {
    const [data, setData] = useState(initialData)
    const [actorId, setActorId] = useState('')
    const [actionType, setActionType] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [page, setPage] = useState(1)
    const [isPending, startTransition] = useTransition()

    const refresh = useCallback(() => {
        startTransition(async () => {
            const result = await getAuditLogs({
                page,
                actorId: actorId || undefined,
                actionType: actionType || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
            })
            setData(result)
        })
    }, [page, actorId, actionType, dateFrom, dateTo])

    useEffect(() => {
        refresh()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, actorId, actionType, dateFrom, dateTo])

    function updateFilter(setter: (v: string) => void, value: string) {
        setter(value)
        setPage(1)
    }

    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <select
                    value={actorId}
                    onChange={(e) => updateFilter(setActorId, e.target.value)}
                    className="h-11 px-3 rounded-md border border-hairline outline-none text-caption"
                >
                    <option value="">All actors</option>
                    {actors.map((actor) => (
                        <option key={actor.id} value={actor.id}>
                            {actor.label}
                        </option>
                    ))}
                </select>
                <select
                    value={actionType}
                    onChange={(e) => updateFilter(setActionType, e.target.value)}
                    className="h-11 px-3 rounded-md border border-hairline outline-none text-caption"
                >
                    <option value="">All actions</option>
                    {actionTypes.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => updateFilter(setDateFrom, e.target.value)}
                    className="h-11 px-3 rounded-md border border-hairline outline-none text-caption"
                    aria-label="From date"
                />
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => updateFilter(setDateTo, e.target.value)}
                    className="h-11 px-3 rounded-md border border-hairline outline-none text-caption"
                    aria-label="To date"
                />
            </div>

            <div className="bg-surface rounded-md shadow-card overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-hairline">
                            <th className="p-4 text-label uppercase tracking-wide text-text-secondary">When</th>
                            <th className="p-4 text-label uppercase tracking-wide text-text-secondary">Actor</th>
                            <th className="p-4 text-label uppercase tracking-wide text-text-secondary">Action</th>
                            <th className="p-4 text-label uppercase tracking-wide text-text-secondary">Target</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-body-md text-text-secondary">
                                    No audit log entries match these filters.
                                </td>
                            </tr>
                        ) : (
                            data.rows.map((row) => (
                                <tr key={row.id} className="border-b border-hairline last:border-0">
                                    <td className="p-4 text-caption text-text-secondary whitespace-nowrap">
                                        {new Date(row.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-caption text-ink">
                                        {row.actor_role ?? 'system'}
                                    </td>
                                    <td className="p-4 text-caption text-ink font-medium">{row.action}</td>
                                    <td className="p-4 text-caption text-text-secondary">
                                        {row.target_table ? `${row.target_table}:${row.target_id}` : '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between mt-4">
                <span className="text-caption text-text-secondary">
                    Page {data.page} of {data.totalPages} · {data.totalCount} total entries
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={isPending || data.page <= 1}
                        className="h-9 px-4 rounded-md border border-hairline text-caption font-medium disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                        disabled={isPending || data.page >= data.totalPages}
                        className="h-9 px-4 rounded-md border border-hairline text-caption font-medium disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}