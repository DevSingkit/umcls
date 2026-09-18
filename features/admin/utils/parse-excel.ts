// Turns an uploaded Excel file into simple rows for the bulk import action,
// and generates downloadable Excel files (import template + post-import
// credentials export) using the same SheetJS library.
import * as XLSX from 'xlsx'
import type { BulkImportRow } from '@/features/admin/actions/bulk-import'

export function parseUserImportExcel(buffer: ArrayBuffer): BulkImportRow[] {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) return []

    const sheet = workbook.Sheets[firstSheetName]
    if (!sheet) return []

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    return rows.map((row) => ({
        fullName: String(row.full_name ?? row.fullName ?? row['Full Name'] ?? '').trim(),
        email: String(row.email ?? row.Email ?? '').trim(),
        role: String(row.role ?? row.Role ?? '').trim(),
    }))
}

export function generateExcelTemplate(): Blob {
    const worksheet = XLSX.utils.aoa_to_sheet([
        ['full_name', 'email', 'role'],
        ['Juan Dela Cruz', 'juan.delacruz@example.com', 'student'],
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users')

    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    return new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
}

// Post-import export: gives the admin a file of every newly created
// account's temporary password, so they can save/print/distribute it
// instead of manually copying from the on-screen results table. This
// is the only place these passwords ever get written down — nothing
// server-side stores them, matching the existing "shown once" design.
export function generateCredentialsExcel(
    created: { fullName: string; email: string; role: string; temporaryPassword: string }[]
): Blob {
    const worksheet = XLSX.utils.aoa_to_sheet([
        ['Full Name', 'Email', 'Role', 'Temporary Password'],
        ...created.map((c) => [c.fullName, c.email, c.role, c.temporaryPassword]),
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'New Accounts')

    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    return new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
}
