import { requireRole } from '@/lib/auth/get-current-user'
import { BulkImportForm } from '@/features/admin/components/BulkImportForm'

export default async function BulkImportPage() {
    await requireRole(['admin'])

    return (
        <div>
            <h1 className="mb-8 text-h1 text-ink">Bulk Import Accounts</h1>
            <BulkImportForm />
        </div>
    )
}
