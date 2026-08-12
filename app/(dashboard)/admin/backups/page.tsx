import { Download } from 'lucide-react'
import { requireRole } from '@/lib/auth/get-current-user'

// Admin backups: two CSV downloads, hit directly as GET requests to
// their own Route Handlers (not Server Actions) — see
// app/api/admin/backup/users/route.ts and .../grades/route.ts for the
// actual auth + CSV generation. This page itself does no data
// fetching, it's just the entry point now reachable from the sidebar
// (see nav-items.ts) instead of a dashboard card.
export default async function AdminBackupsPage() {
    await requireRole(['admin'])

    return (
        <div className="min-h-screen bg-canvas">
            <div className="mx-auto max-w-3xl space-y-8">
                <div>
                    <h1 className="text-h1 text-ink mt-2">Backups</h1>
                    <p className="text-body-md text-text-secondary mt-2">
                        Download a full snapshot of the school&apos;s data as an Excel file.
                    </p>
                </div>

                <a
                    href="/api/admin/backup/users"
                    className="bg-surface rounded-md shadow-card p-6 flex items-start gap-4 hover:bg-surface-sunken"
                >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                        <Download size={20} aria-hidden="true" />
                    </div>
                    <div>
                        <span className="text-body-emphasis text-ink block mb-1">Users backup</span>
                        <span className="text-caption text-text-secondary">
                            Every account&apos;s name, email, role, and status.
                        </span>
                    </div>
                </a>

                <a
                    href="/api/admin/backup/grades"
                    className="bg-surface rounded-md shadow-card p-6 flex items-start gap-4 hover:bg-surface-sunken"
                >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-info-soft text-info">
                        <Download size={20} aria-hidden="true" />
                    </div>
                    <div>
                        <span className="text-body-emphasis text-ink block mb-1">Grades backup</span>
                        <span className="text-caption text-text-secondary">
                            Every graded assignment and quiz, per student, across every class.
                        </span>
                    </div>
                </a>
            </div>
        </div>
    )
}
