// See SECURITY.md §7.4 (FIND-018): CSV exports must have a mandatory
// date range, capped at 90 days, to bound how much student data one
// request can pull out of the system in one file.
//
// This is a Route Handler, not a Server Action, so it does NOT use
// requireRole/requireUser (those redirect() via next/navigation, which
// isn't the right shape for an API route returning a file). Auth here
// follows the same pattern as app/api/activity/ping/route.ts: check
// supabase.auth.getUser() directly and return a JSON error with a real
// HTTP status instead.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGradebookForCourseInRange } from '@/features/grades/queries/gradebook'

function toCsvValue(value: string | number): string {
    const str = String(value)
    // Quote anything with a comma, quote, or newline; escape embedded quotes.
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

export async function GET(request: Request) {
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

    if (!profile || !profile.is_active || profile.role !== 'teacher') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!courseId) {
        return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    // Mandatory date range; maximum 90-day window — FIND-018.
    if (!from || !to) {
        return NextResponse.json({ error: 'Date range required' }, { status: 400 })
    }

    const fromDate = new Date(from)
    const toDate = new Date(to)
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    const rangeMs = toDate.getTime() - fromDate.getTime()
    if (rangeMs < 0) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }
    if (rangeMs > 90 * 24 * 60 * 60 * 1000) {
        return NextResponse.json({ error: 'Maximum 90-day range' }, { status: 400 })
    }

    const rows = await getGradebookForCourseInRange(courseId, from, to)

    if (rows === null) {
        return NextResponse.json({ error: 'Course not found or not accessible' }, { status: 404 })
    }

    const header = ['Student', 'Lessons Completed', 'Total Lessons', 'Assignment Average', 'Assignment Count', 'Quiz Average', 'Quiz Count']
    const lines = [
        header.join(','),
        ...rows.map((row) =>
            [
                toCsvValue(row.studentName),
                toCsvValue(row.lessonsCompleted),
                toCsvValue(row.totalLessons),
                toCsvValue(row.assignmentAverage ?? ''),
                toCsvValue(row.assignmentCount),
                toCsvValue(row.quizAverage ?? ''),
                toCsvValue(row.quizCount),
            ].join(',')
        ),
    ]
    const csv = lines.join('\n')

    // Explicit call required — GRADEBOOK_EXPORTED is not one of the
    // events fn_audit_log() covers automatically. audit_logs.action has
    // no CHECK constraint (DATABASE.md §3.20), so this is a new,
    // free-text action name, same as QUIZ_RESPONSE_GRADED elsewhere.
    await supabase.rpc('log_audit_event', {
        p_action: 'GRADEBOOK_EXPORTED',
        p_target_table: 'courses',
        p_target_id: courseId,
        p_metadata: { from, to, row_count: rows.length },
    })

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="gradebook-${courseId}-${from}-to-${to}.csv"`,
        },
    })
}