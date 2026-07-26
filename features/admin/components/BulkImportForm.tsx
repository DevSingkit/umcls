'use client'
// Upload screen for PH2-003 CSV Bulk Import. Kept simple on purpose:
// download a template, upload it back filled in, see clear results.
import { useState } from 'react'
import { bulkImportUsers, type BulkImportResult } from '@/features/admin/actions/bulk-import'
import { parseUserImportCsv, CSV_TEMPLATE } from '@/features/admin/utils/parse-csv'

function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'umcls-user-import-template.csv'
    link.click()
    URL.revokeObjectURL(url)
}

export function BulkImportForm() {
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<BulkImportResult | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return
        setFileName(file.name)
        setResult(null)
        setIsLoading(true)

        const text = await file.text()
        const rows = parseUserImportCsv(text)
        const outcome = await bulkImportUsers(rows)
        setResult(outcome)
        setIsLoading(false)
        // Let the admin upload the same file again after fixing it,
        // without needing to refresh the page.
        event.target.value = ''
    }

    return (
        <div className="bg-surface rounded-md shadow-card p-6">
            <p className="text-body-emphasis text-ink mb-2">Add many accounts at once</p>
            <p className="text-body-md text-text-secondary mb-6">
                Download the template, fill in one row per person, then upload it here. If
                anything in the file has a problem, nothing gets created, so it is safe to try
                again.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                    onClick={downloadTemplate}
                    className="h-11 px-6 flex items-center justify-center rounded-md border border-hairline font-medium"
                >
                    Download template
                </button>
                <label className="h-11 px-6 flex items-center justify-center rounded-md bg-ink text-on-ink font-medium cursor-pointer">
                    {isLoading ? 'Checking file...' : 'Upload filled-in CSV'}
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        disabled={isLoading}
                        className="hidden"
                    />
                </label>
            </div>

            {fileName && !isLoading && (
                <p className="text-caption text-text-secondary mb-4">Last file: {fileName}</p>
            )}

            {result && !result.ok && (
                <div className="rounded-md bg-error-soft border border-error p-4 mb-4">
                    <p className="text-body-md text-error mb-2">{result.error}</p>
                    {result.rowErrors && result.rowErrors.length > 0 && (
                        <ul className="text-caption text-error list-disc pl-5">
                            {result.rowErrors.map((rowError, i) => (
                                <li key={i}>
                                    Row {rowError.row}: {rowError.message}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {result && result.ok && (
                <div>
                    <p className="text-body-md text-success mb-4">
                        {result.created.length} account{result.created.length === 1 ? '' : 's'} created.
                        Write down or print these passwords now, they will not be shown again.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-hairline">
                                    <th className="py-2 pr-4 text-caption text-text-secondary">Name</th>
                                    <th className="py-2 pr-4 text-caption text-text-secondary">Email</th>
                                    <th className="py-2 pr-4 text-caption text-text-secondary">Role</th>
                                    <th className="py-2 pr-4 text-caption text-text-secondary">Temporary password</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.created.map((person, i) => (
                                    <tr key={i} className="border-b border-hairline">
                                        <td className="py-2 pr-4 text-body-md text-ink">{person.fullName}</td>
                                        <td className="py-2 pr-4 text-body-md text-ink">{person.email}</td>
                                        <td className="py-2 pr-4 text-body-md text-ink">{person.role}</td>
                                        <td className="py-2 pr-4 text-body-md text-ink font-mono">
                                            {person.temporaryPassword}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}