import { Download } from 'lucide-react'
import { requireRole } from '@/lib/auth/get-current-user'

// Admin backups: two Excel downloads, hit directly as GET requests to
// their own Route Handlers (not Server Actions) — see
// app/api/admin/backup/users/route.ts and .../grades/route.ts for the
// actual auth + XLSX generation. This page itself does no data
// fetching.
//
// Grades backup route was rebuilt this pass (previous version read
// gradebook_items/gradebook_scores, dropped in migration 083 along
// with the DepEd-weighted grading system) — now sources real
// assignment/quiz scores per course, one worksheet per course.
//
// DESIGN-LMS 2.1 migration: dropped the min-h-screen/bg-canvas/
// mx-auto/max-w-3xl wrapper (AppShell already provides page background
// and padding, same fix applied to the other admin pages). Icon boxes
// h-11/w-11 -> h-14/w-14 to read as clearly tappable link cards.
export default async function AdminBackupsPage() {
    await requireRole(['admin'])

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-h1 text-ink">Backups</h1>
                <p className="text-body-md text-text-secondary mt-2">
                    Download a full snapshot of the school&apos;s data as an Excel file.
                </p>
            </div>

            <a
                href="/api/admin/backup/users"
                className="bg-surface rounded-md shadow-card p-6 flex items-start gap-4 hover:bg-surface-sunken"
            >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
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
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-info-soft text-info">
                    <Download size={20} aria-hidden="true" />
                </div>
                <div>
                    <span className="text-body-emphasis text-ink block mb-1">Scores backup</span>
                    <span className="text-caption text-text-secondary">
                        Every class&apos;s assignment and quiz scores, one sheet per class.
                    </span>
                </div>
            </a>
        </div>
    )
}
