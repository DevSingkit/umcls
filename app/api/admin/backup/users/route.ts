// Admin backup: every user's profile + email as CSV. Same Route
// Handler shape as app/api/gradebook/export/route.ts (auth checked
// directly via supabase.auth.getUser(), not requireRole — see that
// route's own comment for why). No date-range cap here (unlike
// gradebook export's FIND-018 requirement) — a full user roster
// backup is a bounded, admin-only, whole-table snapshot, not an
// open-ended per-course data pull.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllUsersForBackup } from '@/features/admin/actions/backup-queries'

function toCsvValue(value: string | number | boolean): string {
    const str = String(value)
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

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

    const header = ['Full Name', 'Email', 'Role', 'Status', 'Created At']
    const lines = [
        header.join(','),
        ...rows.map((row) =>
            [
                toCsvValue(row.fullName),
                toCsvValue(row.email),
                toCsvValue(row.role),
                toCsvValue(row.isActive ? 'Active' : 'Deactivated'),
                toCsvValue(row.createdAt),
            ].join(',')
        ),
    ]
    const csv = lines.join('\n')

    await supabase.rpc('log_audit_event', {
        p_action: 'USERS_BACKUP_EXPORTED',
        p_metadata: { row_count: rows.length },
    })

    const today = new Date().toISOString().slice(0, 10)

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="users-backup-${today}.csv"`,
        },
    })
}
