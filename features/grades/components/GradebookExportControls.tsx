'use client'
import { useState } from 'react'

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

function todayIso() {
    return new Date().toISOString().slice(0, 10)
}

function ninetyDaysAgoIso() {
    return new Date(Date.now() - NINETY_DAYS_MS).toISOString().slice(0, 10)
}

export function GradebookExportControls({ courseId }: { courseId: string }) {
    const [from, setFrom] = useState(ninetyDaysAgoIso())
    const [to, setTo] = useState(todayIso())
    const [error, setError] = useState('')

    function handleExportClick(e: React.MouseEvent) {
        setError('')
        if (!from || !to) {
            e.preventDefault()
            setError('Please pick both a start and end date.')
            return
        }
        const rangeMs = new Date(to).getTime() - new Date(from).getTime()
        if (rangeMs < 0) {
            e.preventDefault()
            setError('Start date must be before end date.')
            return
        }
        if (rangeMs > NINETY_DAYS_MS) {
            e.preventDefault()
            setError('Date range cannot be longer than 90 days.')
            return
        }
    }

    const exportUrl = `/api/gradebook/export?courseId=${courseId}&from=${from}&to=${to}`

    return (
        <div className="bg-surface rounded-md shadow-card p-4 mb-6 flex flex-wrap items-end gap-3">
            <div>
                <label htmlFor="export-from" className="block text-caption text-text-secondary mb-1">
                    From
                </label>
                <input
                    id="export-from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-9 px-3 rounded-md border-[1.5px] border-hairline-strong bg-surface text-body-md text-ink focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
            </div>
            <div>
                <label htmlFor="export-to" className="block text-caption text-text-secondary mb-1">
                    To
                </label>
                <input
                    id="export-to"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-9 px-3 rounded-md border-[1.5px] border-hairline-strong bg-surface text-body-md text-ink focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
            </div>
            <a
                href={exportUrl}
                onClick={handleExportClick}
                className="h-9 px-4 flex items-center rounded-md border-[1.5px] border-hairline-strong text-ink text-caption font-semibold hover:bg-surface-sunken"
            >
                Export CSV
            </a>
            {error && <p className="text-caption text-error w-full">{error}</p>}
        </div>
    )
}