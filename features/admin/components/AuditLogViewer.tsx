'use client'
// Filterable, paginated, read-only audit log view. No edit or delete
// controls anywhere in this file — audit_logs is immutable by design.
//
// DESIGN-LMS 2.1 migration: filter controls (search, actor, action,
// date range) bumped h-11 -> h-12 (48px secondary floor).
//
// DESIGN-LMS 2.1 bugfix pass: the results table previously relied on
// overflow-x-auto with no visible affordance that it scrolled (§1.5
// bans silent horizontal scroll on mobile). Below sm, this now renders
// as a stacked card list instead; the real <table> is preserved for
// sm and up where the columns fit comfortably.
import { useEffect, useState, useTransition, useCallback } from 'react'
import { getAuditLogs, type AuditLogRow } from '@/features/admin/actions/audit-logs'

function toSentenceCase(value: string) {
    const spaced = value.replace(/_/g, ' ').toLowerCase()
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatWhen(isoString: string) {
    const d = new Date(isoString)
    const date = d.toLocaleDateString()
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    return { date, time }
}

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
    const [search, setSearch] = useState('')
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

    const visibleRows = data.rows.filter((row) => {
        if (!search.trim()) return true
        const q = search.trim().toLowerCase()
        const haystack = [row.actor_name, row.actor_role, toSentenceCase(row.action)]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
        return haystack.includes(q)
    })

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by actor or action"
                    className="h-12 px-3 rounded-md border-2 border-hairline bg-surface outline-none text-caption placeholder:text-text-muted focus:border-brand focus-visible:ring-2 focus-visible:ring-brand w-full sm:w-56"
                />
                <select
                    value={actorId}
                    onChange={(e) => updateFilter(setActorId, e.target.value)}
                    className="h-12 px-3 rounded-md border-2 border-hairline bg-surface outline-none text-caption focus:border-brand focus-visible:ring-2 focus-visible:ring-brand w-full sm:w-44"
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
                    className="h-12 px-3 rounded-md border-2 border-hairline bg-surface outline-none text-caption focus:border-brand focus-visible:ring-2 focus-visible:ring-brand w-full sm:w-44"
                >
                    <option value="">All actions</option>
                    {actionTypes.map((type) => (
                        <option key={type} value={type}>
                            {toSentenceCase(type)}
                        </option>
                    ))}
                </select>

                <div className="h-12 flex items-center gap-2 rounded-md border-2 border-hairline bg-surface px-3 focus-within:border-brand w-full sm:w-auto">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => updateFilter(setDateFrom, e.target.value)}
                        className="h-full min-w-[130px] flex-1 sm:flex-none bg-transparent outline-none text-caption"
                        aria-label="From date"
                    />
                    <span className="text-text-muted shrink-0">–</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => updateFilter(setDateTo, e.target.value)}
                        className="h-full min-w-[130px] flex-1 sm:flex-none bg-transparent outline-none text-caption"
                        aria-label="To date"
                    />
                </div>
            </div>

            <div className="bg-surface rounded-md shadow-card overflow-hidden">
                {/* Mobile: stacked card list (no horizontal scroll, §1.5) */}
                <div className="sm:hidden divide-y divide-hairline">
                    {visibleRows.length === 0 ? (
                        <p className="p-8 text-center text-body-md text-text-secondary">
                            No audit log entries match these filters.
                        </p>
                    ) : (
                        visibleRows.map((row) => {
                            const { date, time } = formatWhen(row.created_at)
                            return (
                                <div key={row.id} className="p-4 flex flex-col gap-1">
                                    <p className="text-caption text-text-secondary">
                                        {date} <span className="text-text-muted">·</span> {time}
                                    </p>
                                    <p className="text-body-emphasis text-ink">
                                        {toSentenceCase(row.action)}
                                    </p>
                                    <p className="text-caption text-text-secondary">
                                        {row.actor_name ?? toSentenceCase(row.actor_role ?? 'system')}
                                        {row.actor_name && row.actor_role && (
                                            <> ({toSentenceCase(row.actor_role)})</>
                                        )}
                                    </p>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* sm and up: full table */}
                <table className="hidden sm:table w-full text-left">
                    <thead>
                        <tr className="border-b border-hairline">
                            <th className="p-4 text-label text-text-secondary">When</th>
                            <th className="p-4 text-label text-text-secondary">Actor</th>
                            <th className="p-4 text-label text-text-secondary">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRows.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-body-md text-text-secondary">
                                    No audit log entries match these filters.
                                </td>
                            </tr>
                        ) : (
                            visibleRows.map((row) => {
                                const { date, time } = formatWhen(row.created_at)
                                return (
                                    <tr key={row.id} className="border-b border-hairline last:border-0">
                                        <td className="p-4 text-caption text-text-secondary whitespace-nowrap">
                                            {date} <span className="text-text-muted">·</span> {time}
                                        </td>
                                        <td className="p-4 text-caption text-ink whitespace-nowrap">
                                            {row.actor_name ?? toSentenceCase(row.actor_role ?? 'system')}
                                            {row.actor_name && row.actor_role && (
                                                <span className="text-text-secondary"> ({toSentenceCase(row.actor_role)})</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-caption text-ink font-medium whitespace-nowrap">{toSentenceCase(row.action)}</td>
                                    </tr>
                                )
                            })
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
                        className="h-12 px-4 rounded-md border-2 border-hairline bg-surface text-ink text-caption font-medium hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                        disabled={isPending || data.page >= data.totalPages}
                        className="h-12 px-4 rounded-md border-2 border-hairline bg-surface text-ink text-caption font-medium hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}
