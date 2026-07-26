import { requireRole } from '@/lib/auth/get-current-user'
import { BulkImportForm } from '@/features/admin/components/BulkImportForm'

export default async function BulkImportPage() {
    await requireRole(['admin'])

    return (
        <div>
            <h1 className="text-h1 text-ink mb-8">Bulk Import Accounts</h1>
            <BulkImportForm />
        </div>
    )
}