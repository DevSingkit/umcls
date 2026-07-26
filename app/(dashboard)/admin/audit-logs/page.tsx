import { requireRole } from '@/lib/auth/get-current-user'
import { getAuditLogs, getAuditLogActors, getAuditLogActionTypes } from '@/features/admin/actions/audit-logs'
import { AuditLogViewer } from '@/features/admin/components/AuditLogViewer'

// Admin-only, read-only audit log view (PH2-004).
export default async function AuditLogsPage() {
    await requireRole(['admin'])

    const [initialData, actors, actionTypes] = await Promise.all([
        getAuditLogs({ page: 1 }),
        getAuditLogActors(),
        getAuditLogActionTypes(),
    ])

    return (
        <div>
            <h1 className="text-h1 text-ink mb-8">Audit Log</h1>
            <AuditLogViewer initialData={initialData} actors={actors} actionTypes={actionTypes} />
        </div>
    )
}