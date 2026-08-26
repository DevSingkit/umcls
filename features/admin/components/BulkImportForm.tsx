'use client'
// Upload screen for PH2-003 Bulk Import — Excel (.xlsx) in, Excel (.xlsx) out.
// Admin downloads a template, fills it in, uploads it, then downloads a
// credentials file for the accounts that were just created.
//
// Design pass: only the error-block and success-message tokens changed
// (error/error-soft -> red/red-soft, success stays as-is since it's a
// semantic/status color, not a button) to match the rest of the admin
// pages' destructive-color convention. No upload/parsing/import logic
// touched.
import { useState } from 'react'
import { bulkImportUsers, type BulkImportResult } from '@/features/admin/actions/bulk-import'
import {
    parseUserImportExcel,
    generateExcelTemplate,
    generateCredentialsExcel,
} from '@/features/admin/utils/parse-excel'

function downloadTemplate() {
    const blob = generateExcelTemplate()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'UMCLSI-user-import-template.xlsx'
    link.click()
    URL.revokeObjectURL(url)
}

function downloadCredentials(
    created: { fullName: string; email: string; role: string; temporaryPassword: string }[]
) {
    const blob = generateCredentialsExcel(created)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `UMCLSI-new-accounts-${new Date().toISOString().slice(0, 10)}.xlsx`
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

        const buffer = await file.arrayBuffer()
        const rows = parseUserImportExcel(buffer)
        const outcome = await bulkImportUsers(rows)
        setResult(outcome)
        setIsLoading(false)
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
                    className="h-11 px-6 flex items-center justify-center rounded-md border-[1.5px] border-hairline-strong bg-surface text-ink font-medium hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                    Download template
                </button>
                <label className="h-11 px-6 flex items-center justify-center rounded-md bg-brand text-on-ink font-medium cursor-pointer hover:bg-brand-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2">
                    {isLoading ? 'Checking file...' : 'Upload filled-in Excel file'}
                    <input
                        type="file"
                        accept=".xlsx,.xls"
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
                <div className="rounded-md bg-red-soft border border-red p-4 mb-4">
                    <p className="text-body-md text-red mb-2">{result.error}</p>
                    {result.rowErrors && result.rowErrors.length > 0 && (
                        <ul className="text-caption text-red list-disc pl-5">
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

                    <button
                        onClick={() => downloadCredentials(result.created)}
                        className="h-11 px-6 mb-4 flex items-center justify-center rounded-md bg-brand text-on-ink font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                        Download credentials (Excel)
                    </button>

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