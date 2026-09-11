// Admin backup: every user's profile + email as XLSX. Same Route
// Handler shape as app/api/gradebook/export/route.ts (auth checked
// directly via supabase.auth.getUser(), not requireRole — see that
// route's own comment for why). No date-range cap here (unlike
// gradebook export's FIND-018 requirement) — a full user roster
// backup is a bounded, admin-only, whole-table snapshot, not an
// open-ended per-course data pull.
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { getAllUsersForBackup } from '@/features/admin/actions/backup-queries'

export async function GET() {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_active || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const rows = await getAllUsersForBackup()

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Users')

    sheet.columns = [
        { header: 'Full Name', key: 'fullName', width: 28 },
        { header: 'Email', key: 'email', width: 32 },
        { header: 'Role', key: 'role', width: 12 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Created At', key: 'createdAt', width: 22 },
    ]
    sheet.getRow(1).font = { bold: true }

    for (const row of rows) {
        sheet.addRow({
            fullName: row.fullName,
            email: row.email,
            role: row.role,
            status: row.isActive ? 'Active' : 'Deactivated',
            createdAt: row.createdAt,
        })
    }

    const buffer = await workbook.xlsx.writeBuffer()

    await supabase.rpc('log_audit_event', {
        p_action: 'USERS_BACKUP_EXPORTED',
        p_metadata: { row_count: rows.length },
    })

    const today = new Date().toISOString().slice(0, 10)

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="users-backup-${today}.xlsx"`,
        },
    })
}
