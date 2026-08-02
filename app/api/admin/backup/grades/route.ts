// Admin backup: every graded assignment submission and quiz attempt,
// across every course, as CSV — the full activity-level record, not
// the DepEd component-average summary /admin/grades shows on screen.
// Same Route Handler auth pattern as
// app/api/gradebook/export/route.ts and backup/users/route.ts.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllGradedItemsForBackup } from '@/features/admin/actions/backup-queries'

function toCsvValue(value: string | number | null): string {
    if (value === null) return ''
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

    const rows = await getAllGradedItemsForBackup()

    const header = [
        'Student Name',
        'Student Email',
        'Course',
        'Teacher',
        'Item Type',
        'Item Title',
        'Score',
        'Max Score',
        'Percentage',
        'Graded At',
    ]
    const lines = [
        header.join(','),
        ...rows.map((row) =>
            [
                toCsvValue(row.studentName),
                toCsvValue(row.studentEmail),
                toCsvValue(row.courseTitle),
                toCsvValue(row.teacherName),
                toCsvValue(row.itemType),
                toCsvValue(row.itemTitle),
                toCsvValue(row.score),
                toCsvValue(row.maxScore),
                toCsvValue(row.percentage),
                toCsvValue(row.gradedAt),
            ].join(',')
        ),
    ]
    const csv = lines.join('\n')

    await supabase.rpc('log_audit_event', {
        p_action: 'GRADES_BACKUP_EXPORTED',
        p_metadata: { row_count: rows.length },
    })

    const today = new Date().toISOString().slice(0, 10)

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="grades-backup-${today}.csv"`,
        },
    })
}
