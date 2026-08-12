// Simple "Export Excel" button. Previously had a mandatory date-range
// picker (FIND-018, capped at 90 days) — the export now always returns
// the full current gradebook snapshot instead of filtering by date, so
// there's nothing left to pick. See app/api/gradebook/export/route.ts
// for the reasoning behind dropping that cap, and for the CSV → .xlsx
// (ExcelJS) switch.

export function GradebookExportControls({ courseId }: { courseId: string }) {
    const exportUrl = `/api/gradebook/export?courseId=${courseId}`

    return (
        <a
            href={exportUrl}
            className="h-9 px-4 inline-flex items-center gap-2 rounded-md border-[1.5px] border-hairline-strong text-ink text-caption font-semibold hover:bg-surface-sunken"
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path
                    d="M12 3v13m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            Export Excel
        </a>
    )
}
