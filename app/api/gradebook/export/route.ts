// Exports the current gradebook snapshot for a course as CSV: every
// gradebook_items column, every enrolled student's score in each, and
// each student's Final Grade (same computation as GradebookGrid.tsx
// and get-my-final-grade.ts). Replaces the old assignment/quiz-average
// export after the manual gradebook system replaced that data model —
// see gradebook-items.ts and migration 072.
//
// NOTE ON FIND-018 (SECURITY.md §7.4): the original export had a
// mandatory, 90-day-capped date range specifically to bound how much
// student data one request could pull in a single file. That control
// is deliberately NOT carried over here — per product decision, this
// export has no size cap and always returns the full current
// gradebook. If FIND-018 was tied to a compliance requirement or a
// signed-off audit finding, that sign-off needs to be revisited
// separately; this code change alone does not constitute that review.
//
// This is a Route Handler, not a Server Action, so it does NOT use
// requireRole/requireUser (those redirect() via next/navigation, which
// isn't the right shape for an API route returning a file). Auth here
// follows the same pattern as app/api/activity/ping/route.ts and the
// route this file replaces: check supabase.auth.getUser() directly and
// return a JSON error with a real HTTP status instead.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveWeightProfileKey } from '@/features/grades/queries/gradebook'

type ComponentType = 'written_work' | 'performance_task' | 'quarterly_assessment'
const COMPONENT_ORDER: ComponentType[] = ['written_work', 'performance_task', 'quarterly_assessment']
const COMPONENT_LABEL: Record<ComponentType, string> = {
    written_work: 'Written Work',
    performance_task: 'Performance Task',
    quarterly_assessment: 'Quarterly Assessment',
}

function toCsvValue(value: string | number): string {
    const str = String(value)
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

function round2(n: number) {
    return Math.round(n * 100) / 100
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

    if (!profile || !profile.is_active || (profile.role !== 'teacher' && profile.role !== 'admin')) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
        return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    const { data: course } = await supabase
        .from('courses')
        .select('id, title, subject, teacher_id')
        .eq('id', courseId)
        .is('deleted_at', null)
        .single()

    if (!course) {
        return NextResponse.json({ error: 'Course not found or not accessible' }, { status: 404 })
    }
    if (profile.role !== 'admin' && course.teacher_id !== user.id) {
        return NextResponse.json({ error: 'Course not found or not accessible' }, { status: 404 })
    }

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active')

    const students = (enrollments ?? [])
        .map((e: any) => ({ studentId: e.student_id as string, studentName: (e.users?.full_name as string) ?? 'Unknown' }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName))

    const { data: items } = await supabase
        .from('gradebook_items')
        .select('id, component, label, max_score')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

    const itemIds = (items ?? []).map((i) => i.id)

    const { data: scores } = itemIds.length
        ? await supabase.from('gradebook_scores').select('gradebook_item_id, student_id, score').in('gradebook_item_id', itemIds)
        : { data: [] as { gradebook_item_id: string; student_id: string; score: number }[] }

    const scoreByKey = new Map((scores ?? []).map((s) => [`${s.gradebook_item_id}:${s.student_id}`, s.score]))

    const weightProfileKey = resolveWeightProfileKey(course.subject)
    const { data: weightRow } = await supabase
        .from('subject_weight_profiles')
        .select('written_work_pct, performance_task_pct, quarterly_assessment_pct')
        .eq('profile_key', weightProfileKey)
        .single()
    const weights = weightRow ?? { written_work_pct: 20, performance_task_pct: 50, quarterly_assessment_pct: 30 }

    const itemsByComponent: Record<ComponentType, any[]> = {
        written_work: [],
        performance_task: [],
        quarterly_assessment: [],
    }
    for (const item of items ?? []) {
        itemsByComponent[item.component as ComponentType].push(item)
    }

    const header = ['Student']
    for (const component of COMPONENT_ORDER) {
        for (const item of itemsByComponent[component]) {
            header.push(`${COMPONENT_LABEL[component]} - ${item.label} (/${item.max_score})`)
        }
    }
    header.push('Final Grade')

    const lines = [header.join(',')]

    for (const student of students) {
        const row: (string | number)[] = [student.studentName]
        let finalGrade = 0
        let hasAnyGraded = false

        for (const component of COMPONENT_ORDER) {
            const componentItems = itemsByComponent[component]
            let totalRaw = 0
            let totalMax = 0
            let componentHasAny = false

            for (const item of componentItems) {
                const raw = scoreByKey.get(`${item.id}:${student.studentId}`)
                row.push(raw !== undefined ? raw : '')
                if (raw !== undefined) {
                    totalRaw += raw
                    totalMax += item.max_score
                    componentHasAny = true
                }
            }

            if (componentHasAny && totalMax > 0) {
                hasAnyGraded = true
                const ps = (totalRaw / totalMax) * 100
                const weightPct =
                    component === 'written_work'
                        ? weights.written_work_pct
                        : component === 'performance_task'
                          ? weights.performance_task_pct
                          : weights.quarterly_assessment_pct
                finalGrade += (ps * weightPct) / 100
            }
        }

        row.push(hasAnyGraded ? round2(finalGrade) : '')
        lines.push(row.map((v) => toCsvValue(v)).join(','))
    }

    const csv = lines.join('\n')

    await supabase.rpc('log_audit_event', {
        p_action: 'GRADEBOOK_EXPORTED',
        p_target_table: 'courses',
        p_target_id: courseId,
        p_metadata: { student_count: students.length, item_count: (items ?? []).length },
    })

    const todayStamp = new Date().toISOString().slice(0, 10)

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="gradebook-${courseId}-${todayStamp}.csv"`,
        },
    })
}
