// Simple "Export CSV" button. Previously had a mandatory date-range
// picker (FIND-018, capped at 90 days) — the export now always returns
// the full current gradebook snapshot instead of filtering by date, so
// there's nothing left to pick. See app/api/gradebook/export/route.ts
// for the reasoning behind dropping that cap.

export function GradebookExportControls({ courseId }: { courseId: string }) {
    const exportUrl = `/api/gradebook/export?courseId=${courseId}`

    return (
        <div className="bg-surface rounded-md shadow-card p-4 mb-6">
            <a
                href={exportUrl}
                className="h-9 px-4 inline-flex items-center rounded-md border-[1.5px] border-hairline-strong text-ink text-caption font-semibold hover:bg-surface-sunken"
            >
                Export CSV
            </a>
        </div>
    )
}
