'use server'
// Student's own Final Grade per course, computed from the real
// gradebook_items/gradebook_scores tables — the same numbers the
// teacher's GradebookGrid shows, not an independent computation from
// raw assignment/quiz scores (that was the old approach in
// student-grades.ts's getMyDepEdGradeForCourse, now superseded by
// this for anything shown to the student).
//
// Returns null grade (not an error) when courses.grades_visible_to_students
// is false — the course still shows up on the student's grades page,
// just with an empty cell, per product decision. Only individual item
// scores and component breakdowns stay hidden either way; a student
// never sees the underlying gradebook grid, only this single number.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { resolveWeightProfileKey } from '@/features/grades/queries/gradebook'

type ComponentType = 'written_work' | 'performance_task' | 'quarterly_assessment'

const COMPONENT_ORDER: ComponentType[] = ['written_work', 'performance_task', 'quarterly_assessment']

function round2(n: number) {
    return Math.round(n * 100) / 100
}

export type MyFinalGrade = {
    courseId: string
    courseTitle: string
    subject: string | null
    visible: boolean
    finalGrade: number | null // null if not visible, or if nothing graded yet
}

export async function getMyFinalGrades(): Promise<MyFinalGrade[]> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, courses!inner(id, title, subject, grades_visible_to_students)')
        .eq('student_id', user.id)
        .eq('status', 'active')

    const results: MyFinalGrade[] = []

    for (const e of enrollments ?? []) {
        const course = (e as any).courses
        const visible = course.grades_visible_to_students as boolean

        if (!visible) {
            results.push({
                courseId: course.id,
                courseTitle: course.title,
                subject: course.subject,
                visible: false,
                finalGrade: null,
            })
            continue
        }

        const finalGrade = await computeMyFinalGrade(course.id, course.subject, user.id, supabase)
        results.push({
            courseId: course.id,
            courseTitle: course.title,
            subject: course.subject,
            visible: true,
            finalGrade,
        })
    }

    return results
}

async function computeMyFinalGrade(
    courseId: string,
    subject: string | null,
    studentId: string,
    supabase: any
): Promise<number | null> {
    const weightProfileKey = resolveWeightProfileKey(subject)

    const { data: weightRow } = await supabase
        .from('subject_weight_profiles')
        .select('written_work_pct, performance_task_pct, quarterly_assessment_pct')
        .eq('profile_key', weightProfileKey)
        .single()

    const weights = weightRow ?? { written_work_pct: 20, performance_task_pct: 50, quarterly_assessment_pct: 30 }

    const { data: items } = await supabase
        .from('gradebook_items')
        .select('id, component, max_score')
        .eq('course_id', courseId)
        .is('deleted_at', null)

    const itemIds = (items ?? []).map((i: any) => i.id)
    if (itemIds.length === 0) return null

    const { data: scores } = await supabase
        .from('gradebook_scores')
        .select('gradebook_item_id, score')
        .eq('student_id', studentId)
        .in('gradebook_item_id', itemIds)

    const scoreByItemId = new Map((scores ?? []).map((s: any) => [s.gradebook_item_id, s.score]))

    const buckets: Record<ComponentType, { raw: number; max: number; hasAny: boolean }> = {
        written_work: { raw: 0, max: 0, hasAny: false },
        performance_task: { raw: 0, max: 0, hasAny: false },
        quarterly_assessment: { raw: 0, max: 0, hasAny: false },
    }

    for (const item of items ?? []) {
        const raw = scoreByItemId.get(item.id)
        if (raw === undefined) continue
        const bucket = buckets[item.component as ComponentType]
        bucket.raw += raw as number
        bucket.max += item.max_score
        bucket.hasAny = true
    }

    let finalGrade = 0
    let hasAnyGraded = false

    for (const component of COMPONENT_ORDER) {
        const bucket = buckets[component]
        if (!bucket.hasAny || bucket.max === 0) continue
        hasAnyGraded = true
        const ps = (bucket.raw / bucket.max) * 100
        const weightPct =
            component === 'written_work'
                ? weights.written_work_pct
                : component === 'performance_task'
                  ? weights.performance_task_pct
                  : weights.quarterly_assessment_pct
        finalGrade += (ps * weightPct) / 100
    }

    return hasAnyGraded ? round2(finalGrade) : null
}
