'use server'
// Backing queries for the two admin backup routes
// (app/api/admin/backup/users, .../grades). Kept separate from
// admin-grades.ts and users.ts because these are shaped specifically
// for a full-record export, not for rendering a UI.
//
// Grade backup rewritten to match the current manual gradebook system
// (migration 072, features/grades/actions/gradebook-items.ts) —
// gradebook_items/gradebook_scores, NOT assignments/quizzes directly.
// The old version of this file read assignment_submissions/
// quiz_attempts, which was the pre-072 auto-computed system and no
// longer reflects what a teacher's gradebook or a student's Final
// Grade actually shows. See gradebook.ts's own comment for the same
// history. Final-grade computation mirrors
// get-my-final-grade.ts's computeMyFinalGrade exactly (same weights
// table, same component bucketing) so the backup's numbers always
// match what a student would see on their own grades page — except
// this backup ignores grades_visible_to_students, since an admin
// snapshot needs every course's numbers regardless of what's been
// exposed to students yet.
//
// Not 'use server' Server Actions in the strict form-action sense —
// these are called directly from Route Handlers (see AUTH_NOTES.md/
// gradebook export route's own comment on why Route Handlers check
// auth directly instead of using requireRole). Marked 'use server'
// only because the file needs to run server-side; no requireRole call
// lives in these functions themselves — the calling route is
// responsible for the admin check, same separation of concerns as
// computeMyFinalGrade in get-my-final-grade.ts.

import { createClient } from '@/lib/supabase/server'
import { resolveWeightProfileKey } from '@/features/grades/queries/gradebook'

export type UserBackupRow = {
    fullName: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
}

// Every user, any role, active or deactivated — a backup needs the
// full roster, not just the active subset the admin Users page
// filters to by default. Soft-deleted (deleted_at set) rows are
// excluded, same as every other list in the app.
export async function getAllUsersForBackup(): Promise<UserBackupRow[]> {
    const supabase = await createClient()

    const { data } = await supabase
        .from('users')
        .select('full_name, email, role, is_active, created_at')
        .is('deleted_at', null)
        .order('role', { ascending: true })
        .order('full_name', { ascending: true })

    return (data ?? []).map((u) => ({
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        isActive: u.is_active,
        createdAt: u.created_at,
    }))
}

type ComponentType = 'written_work' | 'performance_task' | 'quarterly_assessment'

const COMPONENT_LABEL: Record<ComponentType, string> = {
    written_work: 'Written work',
    performance_task: 'Performance task',
    quarterly_assessment: 'Quarterly assessment',
}

const COMPONENT_ORDER: ComponentType[] = ['written_work', 'performance_task', 'quarterly_assessment']

function round2(n: number) {
    return Math.round(n * 100) / 100
}

export type GradebookScoreBackupRow = {
    studentName: string
    studentEmail: string
    courseTitle: string
    teacherName: string
    component: string
    itemLabel: string
    linkedTo: 'Assignment' | 'Quiz' | 'Manual'
    score: number
    maxScore: number
    percentage: number
    gradedAt: string
}

// One row per gradebook_scores entry (every cell a teacher has
// actually filled in), across every course — the real gradebook grid
// data, same source GradebookGrid reads. Students/items with no score
// yet simply have no row, same as the grid renders that as blank, not
// zero.
export async function getAllGradebookScoresForBackup(): Promise<GradebookScoreBackupRow[]> {
    const supabase = await createClient()

    const { data: courses } = await supabase
        .from('courses')
        .select('id, title, users!courses_teacher_id_fkey(full_name)')
        .is('deleted_at', null)

    const courseMeta = new Map(
        (courses ?? []).map((c: any) => [
            c.id,
            { title: c.title as string, teacherName: (c.users?.full_name as string) ?? 'Unknown' },
        ])
    )
    const courseIds = (courses ?? []).map((c) => c.id)
    if (courseIds.length === 0) return []

    const { data: items } = await supabase
        .from('gradebook_items')
        .select('id, course_id, component, label, max_score, linked_assignment_id, linked_quiz_id')
        .in('course_id', courseIds)
        .is('deleted_at', null)

    const itemMeta = new Map(
        (items ?? []).map((i) => [
            i.id,
            {
                courseId: i.course_id as string,
                component: i.component as ComponentType,
                label: i.label as string,
                maxScore: i.max_score as number,
                linkedTo: i.linked_assignment_id
                    ? ('Assignment' as const)
                    : i.linked_quiz_id
                      ? ('Quiz' as const)
                      : ('Manual' as const),
            },
        ])
    )
    const itemIds = (items ?? []).map((i) => i.id)
    if (itemIds.length === 0) return []

    const { data: scores } = await supabase
        .from('gradebook_scores')
        .select('gradebook_item_id, student_id, score, graded_at, users!gradebook_scores_student_id_fkey(full_name, email)')
        .in('gradebook_item_id', itemIds)

    const rows: GradebookScoreBackupRow[] = []

    for (const s of scores ?? []) {
        const item = itemMeta.get(s.gradebook_item_id)
        if (!item) continue
        const course = courseMeta.get(item.courseId)
        const studentUser = (s as any).users
        rows.push({
            studentName: studentUser?.full_name ?? 'Unknown',
            studentEmail: studentUser?.email ?? '',
            courseTitle: course?.title ?? 'Unknown course',
            teacherName: course?.teacherName ?? 'Unknown',
            component: COMPONENT_LABEL[item.component],
            itemLabel: item.label,
            linkedTo: item.linkedTo,
            score: s.score,
            maxScore: item.maxScore,
            percentage: item.maxScore > 0 ? round2((s.score / item.maxScore) * 100) : 0,
            gradedAt: s.graded_at,
        })
    }

    // Newest-graded first, matching the previous backup's ordering
    // convention.
    rows.sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())

    return rows
}

export type FinalGradeBackupRow = {
    studentName: string
    studentEmail: string
    courseTitle: string
    subject: string | null
    teacherName: string
    finalGrade: number | null
    visibleToStudent: boolean
}

// One row per enrolled student per course: their computed Final
// Grade, using the exact same weighted-component formula as
// get-my-final-grade.ts's computeMyFinalGrade (same subject_weight_profiles
// lookup, same written_work/performance_task/quarterly_assessment
// bucketing). Deliberately ignores grades_visible_to_students — this
// is an admin snapshot of the real numbers, not what a student
// currently sees, though visibleToStudent is included per row so an
// admin can tell which ones are actually exposed yet.
export async function getAllFinalGradesForBackup(): Promise<FinalGradeBackupRow[]> {
    const supabase = await createClient()

    const { data: courses } = await supabase
        .from('courses')
        .select('id, title, subject, grades_visible_to_students, users!courses_teacher_id_fkey(full_name)')
        .is('deleted_at', null)

    if (!courses || courses.length === 0) return []

    const { data: weightProfiles } = await supabase
        .from('subject_weight_profiles')
        .select('profile_key, written_work_pct, performance_task_pct, quarterly_assessment_pct')

    const weightsByKey = new Map((weightProfiles ?? []).map((w) => [w.profile_key, w]))
    const defaultWeights = { written_work_pct: 20, performance_task_pct: 50, quarterly_assessment_pct: 30 }

    const rows: FinalGradeBackupRow[] = []

    for (const course of courses as any[]) {
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('student_id, users!enrollments_student_id_fkey(full_name, email)')
            .eq('course_id', course.id)
            .eq('status', 'active')

        if (!enrollments || enrollments.length === 0) continue

        const { data: items } = await supabase
            .from('gradebook_items')
            .select('id, component, max_score')
            .eq('course_id', course.id)
            .is('deleted_at', null)

        const itemIds = (items ?? []).map((i) => i.id)

        const { data: scores } = itemIds.length
            ? await supabase
                  .from('gradebook_scores')
                  .select('gradebook_item_id, student_id, score')
                  .in('gradebook_item_id', itemIds)
            : { data: [] as { gradebook_item_id: string; student_id: string; score: number }[] }

        const weightProfileKey = resolveWeightProfileKey(course.subject)
        const weights = weightsByKey.get(weightProfileKey) ?? defaultWeights

        for (const e of enrollments as any[]) {
            const studentScores = (scores ?? []).filter((s) => s.student_id === e.student_id)
            const scoreByItemId = new Map(studentScores.map((s) => [s.gradebook_item_id, s.score]))

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

            rows.push({
                studentName: e.users?.full_name ?? 'Unknown',
                studentEmail: e.users?.email ?? '',
                courseTitle: course.title,
                subject: course.subject,
                teacherName: course.users?.full_name ?? 'Unknown',
                finalGrade: hasAnyGraded ? round2(finalGrade) : null,
                visibleToStudent: course.grades_visible_to_students ?? false,
            })
        }
    }

    rows.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle) || a.studentName.localeCompare(b.studentName))

    return rows
}
