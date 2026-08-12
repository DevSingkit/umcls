// Admin backup: the real teacher-built gradebook (gradebook_items /
// gradebook_scores, migration 072), as XLSX — two sheets: every
// individual score entry, and every student's computed Final Grade
// per course (same formula as get-my-final-grade.ts). Replaces the
// old assignment_submissions/quiz_attempts activity-log version, which
// stopped reflecting the real grading system once migration 072
// shipped. Same Route Handler auth pattern as
// app/api/gradebook/export/route.ts and backup/users/route.ts.
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { getAllGradebookScoresForBackup, getAllFinalGradesForBackup } from '@/features/admin/actions/backup-queries'

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

    const [scoreRows, finalGradeRows] = await Promise.all([
        getAllGradebookScoresForBackup(),
        getAllFinalGradesForBackup(),
    ])

    const workbook = new ExcelJS.Workbook()

    const scoresSheet = workbook.addWorksheet('Gradebook Scores')
    scoresSheet.columns = [
        { header: 'Student Name', key: 'studentName', width: 24 },
        { header: 'Student Email', key: 'studentEmail', width: 30 },
        { header: 'Course', key: 'courseTitle', width: 22 },
        { header: 'Teacher', key: 'teacherName', width: 22 },
        { header: 'Component', key: 'component', width: 20 },
        { header: 'Column', key: 'itemLabel', width: 16 },
        { header: 'Linked To', key: 'linkedTo', width: 12 },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'Max Score', key: 'maxScore', width: 12 },
        { header: 'Percentage', key: 'percentage', width: 12 },
        { header: 'Graded At', key: 'gradedAt', width: 22 },
    ]
    scoresSheet.getRow(1).font = { bold: true }
    for (const row of scoreRows) {
        scoresSheet.addRow(row)
    }
    scoresSheet.getColumn('percentage').numFmt = '0.00"%"'

    const finalGradesSheet = workbook.addWorksheet('Final Grades')
    finalGradesSheet.columns = [
        { header: 'Student Name', key: 'studentName', width: 24 },
        { header: 'Student Email', key: 'studentEmail', width: 30 },
        { header: 'Course', key: 'courseTitle', width: 22 },
        { header: 'Subject', key: 'subject', width: 16 },
        { header: 'Teacher', key: 'teacherName', width: 22 },
        { header: 'Final Grade', key: 'finalGrade', width: 14 },
        { header: 'Visible to Student', key: 'visibleToStudent', width: 16 },
    ]
    finalGradesSheet.getRow(1).font = { bold: true }
    for (const row of finalGradeRows) {
        finalGradesSheet.addRow({
            studentName: row.studentName,
            studentEmail: row.studentEmail,
            courseTitle: row.courseTitle,
            subject: row.subject ?? '',
            teacherName: row.teacherName,
            finalGrade: row.finalGrade,
            visibleToStudent: row.visibleToStudent ? 'Yes' : 'No',
        })
    }
    finalGradesSheet.getColumn('finalGrade').numFmt = '0.00'

    const buffer = await workbook.xlsx.writeBuffer()

    await supabase.rpc('log_audit_event', {
        p_action: 'GRADES_BACKUP_EXPORTED',
        p_metadata: { score_row_count: scoreRows.length, final_grade_row_count: finalGradeRows.length },
    })

    const today = new Date().toISOString().slice(0, 10)

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="grades-backup-${today}.xlsx"`,
        },
    })
}
