// Turns raw CSV text into simple rows for the bulk import action.
// Kept intentionally simple: no external CSV library needed since the
// format is just three plain columns with no quoted commas expected.
import type { BulkImportRow } from '@/features/admin/actions/bulk-import'

export function parseUserImportCsv(text: string): BulkImportRow[] {
    const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

    if (lines.length === 0) return []

    // Skip the header row (first line), whatever it says.
    const dataLines = lines.slice(1)

    return dataLines.map((line) => {
        const [fullName = '', email = '', role = ''] = line.split(',').map((cell) => cell.trim())
        return { fullName, email, role }
    })
}

export const CSV_TEMPLATE = 'full_name,email,role\nJuan Dela Cruz,juan.delacruz@example.com,student\n'
