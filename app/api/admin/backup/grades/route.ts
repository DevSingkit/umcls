// Admin backup: every course's grades as XLSX, one worksheet per
// course. Rebuilt from scratch — the old DepEd-weighted version was
// removed when gradebook_items/gradebook_scores/subject_weight_profiles
// were dropped (migration 083). Sourced from getAllCourseGradesForBackup,
// same real assignment/quiz data as the live Classroom-style gradebook
// grid — no manual columns, no weights, no Final Grade.
//
// Same auth pattern as app/api/admin/backup/users/route.ts: checked
// directly via supabase.auth.getUser(), not requireRole (see that
// route's comment for why).
//
// Layout per sheet:
//   Teacher: {name}
//   Course: {title} — {description}
//   (blank row)
//   Student Name | Quiz Title | Quiz Title | Assignment Title | ...
//   Student A    | 0/5        | 0/10       | 80/100           | ...
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { getAllCourseGradesForBackup } from '@/features/admin/actions/backup-queries'

// Excel sheet names: max 31 chars, and : \ / ? * [ ] are not allowed.
// Courses with duplicate/colliding sanitized names get a numeric
// suffix so ExcelJS doesn't throw on a repeated sheet name.
function sanitizeSheetName(rawTitle: string, usedNames: Set<string>): string {
    let base = rawTitle.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31)
    if (!base) base = 'Course'

    let candidate = base
    let suffix = 2
    while (usedNames.has(candidate.toLowerCase())) {
        const suffixText = ` (${suffix})`
        candidate = base.slice(0, 31 - suffixText.length) + suffixText
        suffix += 1
    }
    usedNames.add(candidate.toLowerCase())
    return candidate
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

    const courses = await getAllCourseGradesForBackup()

    const workbook = new ExcelJS.Workbook()
    const usedSheetNames = new Set<string>()

    if (courses.length === 0) {
        workbook.addWorksheet('Grades').addRow(['No courses yet.'])
    }

    for (const course of courses) {
        const sheet = workbook.addWorksheet(sanitizeSheetName(course.courseTitle, usedSheetNames))

        sheet.addRow([`Teacher: ${course.teacherName}`])
        sheet.addRow([
            course.courseDescription
                ? `Course: ${course.courseTitle} — ${course.courseDescription}`
                : `Course: ${course.courseTitle}`,
        ])
        sheet.addRow([])

        const headerRow = sheet.addRow([
            'Student Name',
            ...course.columns.map((c) => c.title),
        ])
        headerRow.font = { bold: true }

        const scoreByPair = new Map(
            course.scores.map((s) => [`${s.columnId}:${s.studentId}`, s.score])
        )

        if (course.students.length === 0) {
            sheet.addRow(['No students enrolled yet.'])
        }

        for (const student of course.students) {
            const rowValues = [
                student.studentName,
                ...course.columns.map((column) => {
                    const score = scoreByPair.get(`${column.id}:${student.studentId}`)
                    return score === undefined || score === null
                        ? '—'
                        : `${score}/${column.maxScore}`
                }),
            ]
            sheet.addRow(rowValues)
        }

        sheet.getColumn(1).width = 28
        for (let i = 2; i <= course.columns.length + 1; i++) {
            sheet.getColumn(i).width = 18
        }
    }

    const buffer = await workbook.xlsx.writeBuffer()

    await supabase.rpc('log_audit_event', {
        p_action: 'GRADES_BACKUP_EXPORTED',
        p_metadata: { course_count: courses.length },
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
