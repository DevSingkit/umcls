// See lib/auth/AUTH_NOTES.md for why these checks exist.
//
// This intentionally does NOT read or write the `grades` table.
// DATABASE.md defines assignment_average/quiz_average/overall_grade on
// `grades`, meant to be maintained by computeRunningAverage() — but that
// function was never implemented, so `grades` has no populated write
// path anywhere in the codebase. Rather than build on top of a table
// nobody writes to, this computes assignment and quiz averages live
// from assignment_submissions and quiz_attempts. See the note added to
// TASKS.md for the deferred decision on combining these into a single
// overall_grade (weighting policy, letter grade scale) — out of scope
// here on purpose.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type GradebookRow = {
    studentId: string
    studentName: string
    lessonsCompleted: number
    totalLessons: number
    assignmentAverage: number | null // 0-100, normalized per assignment's max_score
    assignmentCount: number
    quizAverage: number | null // 0-100
    quizCount: number
}

// DepEd Matatag component weighting (migration 057). This is the real,
// official computation — confirmed against DepEd Order 8, s.2015's
// published steps, not just this app's own assignment/quiz split:
//   1. Per item: percentage_score = raw_score / max_score * 100
//   2. Per component (Written Work, Performance Task, Quarterly
//      Assessment): average every item's percentage_score tagged with
//      that component, POOLING assignments and quizzes together — DepEd
//      has no concept of "assignment average" vs "quiz average", that
//      split only exists in this app's own data model, not in the real
//      grading system. A Written Work item can be either an assignment
//      or a quiz; both count toward the same Written Work average.
//   3. initial_grade = sum of (component_average * component_weight)
//      across all three components, using the subject's weight profile
//      (subject_weight_profiles — 'default' 20/50/30, or 'mapeh' 20/60/20)
//   4. Real DepEd process transmutes this initial_grade via an official
//      table before it appears on a report card (e.g. 75 raw -> 88
//      transmuted). Deliberately NOT implemented here yet — decided to
//      show the raw initial_grade only, for now. Transmutation is a
//      pure display-layer lookup on top of this number, not a change to
//      how the number itself is computed, so it can be layered on later
//      without touching this function.
export type DepEdGradeRow = {
    studentId: string
    studentName: string
    writtenWorkAvg: number | null // 0-100, null if no written_work items graded yet
    performanceTaskAvg: number | null
    quarterlyAssessmentAvg: number | null
    initialGrade: number | null // null if every component is null (nothing graded at all)
    weightProfile: 'default' | 'mapeh'
}

type ComponentType = 'written_work' | 'performance_task' | 'quarterly_assessment'

// Subject name -> weight profile key. Free-text courses.subject means
// this can't be a straight foreign key (see migration 057's comment on
// subject_weight_profiles) — matching is intentionally simple
// (case-insensitive exact match on "mapeh", everything else falls back
// to 'default') rather than fuzzy, since a wrong silent match here
// would misgrade a whole subject. If a course's subject doesn't match
// 'mapeh' exactly, it gets 'default' even if it's misspelled or blank —
// worth surfacing to the teacher/admin as a data-quality check
// eventually, not guessed around here.
function resolveWeightProfileKey(subject: string | null): 'default' | 'mapeh' {
    return subject?.trim().toLowerCase() === 'mapeh' ? 'mapeh' : 'default'
}

export async function getDepEdGradesForCourse(courseId: string): Promise<DepEdGradeRow[] | null> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id, subject')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) return null

    return computeDepEdGradesForCourse(courseId, course.subject)
}

// Role-agnostic core of the DepEd computation, factored out so the
// admin-scoped query (features/admin/actions/admin-grades.ts) can reuse
// the exact same logic instead of a second copy that could drift out of
// sync with this one. Every caller MUST have already verified the
// caller has legitimate access to this course (teacher ownership, or
// admin role) before calling this — this function itself does no
// authorization, only computation, same separation of concerns as
// grade-short-answer.ts's computeAttemptTotal pattern noted elsewhere in
// this codebase.
export async function computeDepEdGradesForCourse(
    courseId: string,
    subject: string | null
): Promise<DepEdGradeRow[]> {
    const supabase = await createClient()

    const weightProfileKey = resolveWeightProfileKey(subject)

    const { data: weightProfile } = await supabase
        .from('subject_weight_profiles')
        .select('written_work_pct, performance_task_pct, quarterly_assessment_pct')
        .eq('profile_key', weightProfileKey)
        .single()

    // Falls back to the DepEd default (20/50/30) if the profile row is
    // somehow missing — should never happen post-migration-057 (both
    // rows are seeded there), but a missing weight profile should never
    // silently produce a 0% grade; falling back to the documented
    // default is safer than returning null for every student.
    const weights = weightProfile ?? { written_work_pct: 20, performance_task_pct: 50, quarterly_assessment_pct: 30 }

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active')

    const students = (enrollments ?? []).map((e: any) => ({
        studentId: e.student_id as string,
        studentName: (e.users?.full_name as string) ?? 'Unknown',
    }))

    if (students.length === 0) return []

    const { data: assignments } = await supabase
        .from('assignments')
        .select('id, max_score, grading_component')
        .eq('course_id', courseId)
        .is('deleted_at', null)

    const assignmentMeta = new Map(
        (assignments ?? []).map((a) => [a.id, { maxScore: a.max_score, component: a.grading_component as ComponentType }])
    )
    const assignmentIds = (assignments ?? []).map((a) => a.id)

    const { data: submissions } = assignmentIds.length
        ? await supabase
              .from('assignment_submissions')
              .select('student_id, assignment_id, score, status')
              .in('assignment_id', assignmentIds)
              .in('status', ['graded', 'returned'])
        : { data: [] as { student_id: string; assignment_id: string; score: number | null; status: string }[] }

    const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, grading_component')
        .eq('course_id', courseId)
        .is('deleted_at', null)

    const quizComponentById = new Map((quizzes ?? []).map((q) => [q.id, q.grading_component as ComponentType]))
    const quizIds = (quizzes ?? []).map((q) => q.id)

    const { data: attempts } = quizIds.length
        ? await supabase
              .from('quiz_attempts')
              .select('student_id, quiz_id, score, status')
              .in('quiz_id', quizIds)
              .eq('status', 'graded')
        : { data: [] as { student_id: string; quiz_id: string; score: number | null; status: string }[] }

    // Pool percentage scores per student, per component — this is the
    // "assignments and quizzes count toward the same component average"
    // rule confirmed above, not two separate lists merged at the end.
    const percentagesByStudentAndComponent = new Map<string, Record<ComponentType, number[]>>()

    function ensureStudentBucket(studentId: string) {
        if (!percentagesByStudentAndComponent.has(studentId)) {
            percentagesByStudentAndComponent.set(studentId, {
                written_work: [],
                performance_task: [],
                quarterly_assessment: [],
            })
        }
        return percentagesByStudentAndComponent.get(studentId)!
    }

    for (const s of submissions ?? []) {
        if (s.score === null) continue
        const meta = assignmentMeta.get(s.assignment_id)
        if (!meta) continue
        const pct = meta.maxScore > 0 ? (s.score / meta.maxScore) * 100 : 0
        ensureStudentBucket(s.student_id)[meta.component].push(pct)
    }

    for (const a of attempts ?? []) {
        // quiz_attempts.score is already a 0-100 percentage (see
        // gradebook.ts's existing quiz-average comment above), so no
        // max_score normalization needed here, same as the existing
        // getGradebookForCourseInRange logic.
        if (a.score === null) continue
        const component = quizComponentById.get(a.quiz_id)
        if (!component) continue
        ensureStudentBucket(a.student_id)[component].push(a.score)
    }

    function average(values: number[]): number | null {
        if (values.length === 0) return null
        return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
    }

    return students.map((student) => {
        const buckets = percentagesByStudentAndComponent.get(student.studentId) ?? {
            written_work: [],
            performance_task: [],
            quarterly_assessment: [],
        }

        const writtenWorkAvg = average(buckets.written_work)
        const performanceTaskAvg = average(buckets.performance_task)
        const quarterlyAssessmentAvg = average(buckets.quarterly_assessment)

        // A component with zero graded items contributes nothing yet —
        // treated as 0 for the weighted sum (not skipped/reweighted),
        // matching how a real report card would show an incomplete
        // grade rather than silently inflating it by excluding ungraded
        // components. If every component is still null, the whole
        // initialGrade is null (nothing to show at all) rather than a
        // misleading 0.
        const allNull = writtenWorkAvg === null && performanceTaskAvg === null && quarterlyAssessmentAvg === null

        const initialGrade = allNull
            ? null
            : Math.round(
                  (((writtenWorkAvg ?? 0) * weights.written_work_pct +
                      (performanceTaskAvg ?? 0) * weights.performance_task_pct +
                      (quarterlyAssessmentAvg ?? 0) * weights.quarterly_assessment_pct) /
                      100) *
                      100
              ) / 100

        return {
            studentId: student.studentId,
            studentName: student.studentName,
            writtenWorkAvg,
            performanceTaskAvg,
            quarterlyAssessmentAvg,
            initialGrade,
            weightProfile: weightProfileKey,
        }
    })
}

export async function getGradebookForCourse(courseId: string): Promise<GradebookRow[] | null> {
    return getGradebookForCourseInRange(courseId, null, null)
}

export async function getGradebookForCourseInRange(
    courseId: string,
    from: string | null,
    to: string | null
): Promise<GradebookRow[] | null> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) return null

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active')

    const students = (enrollments ?? []).map((e: any) => ({
        studentId: e.student_id as string,
        studentName: (e.users?.full_name as string) ?? 'Unknown',
    }))

    if (students.length === 0) return []

    // Lessons completed vs total published lessons in the course.
    const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .is('deleted_at', null)

    const lessonIds = (lessons ?? []).map((l) => l.id)
    const totalLessons = lessonIds.length

    const { data: completions } = lessonIds.length
        ? await supabase
            .from('lesson_completions')
            .select('student_id, lesson_id')
            .in('lesson_id', lessonIds)
        : { data: [] as { student_id: string; lesson_id: string }[] }

    const completionsByStudent = new Map<string, number>()
    for (const c of completions ?? []) {
        completionsByStudent.set(c.student_id, (completionsByStudent.get(c.student_id) ?? 0) + 1)
    }

    // Assignment average — normalized to a 0-100 percentage per
    // assignment (max_score varies per assignment), then averaged
    // across every graded/returned submission for that student.
    const { data: assignments } = await supabase
        .from('assignments')
        .select('id, max_score')
        .eq('course_id', courseId)
        .is('deleted_at', null)

    const maxScoreByAssignment = new Map((assignments ?? []).map((a) => [a.id, a.max_score]))
    const assignmentIds = (assignments ?? []).map((a) => a.id)

    let submissionsQuery = supabase
        .from('assignment_submissions')
        .select('student_id, assignment_id, score, status')
        .in('assignment_id', assignmentIds)
        .in('status', ['graded', 'returned'])

    if (from) submissionsQuery = submissionsQuery.gte('graded_at', from)
    if (to) submissionsQuery = submissionsQuery.lte('graded_at', to)

    const { data: submissions } = assignmentIds.length
        ? await submissionsQuery
        : { data: [] as { student_id: string; assignment_id: string; score: number | null; status: string }[] }

    const assignmentPercentagesByStudent = new Map<string, number[]>()
    for (const s of submissions ?? []) {
        if (s.score === null) continue
        const maxScore = maxScoreByAssignment.get(s.assignment_id) ?? 100
        const pct = maxScore > 0 ? (s.score / maxScore) * 100 : 0
        const list = assignmentPercentagesByStudent.get(s.student_id) ?? []
        list.push(pct)
        assignmentPercentagesByStudent.set(s.student_id, list)
    }

    // Quiz average — quiz_attempts.score is already stored 0-100 (see
    // grade-quiz-submission.ts / grade-short-answer.ts), so no
    // normalization needed here, just average across graded attempts.
    const { data: quizzes } = await supabase.from('quizzes').select('id').eq('course_id', courseId)
    const quizIds = (quizzes ?? []).map((q) => q.id)

    let attemptsQuery = supabase
        .from('quiz_attempts')
        .select('student_id, score, status')
        .in('quiz_id', quizIds)
        .eq('status', 'graded')

    if (from) attemptsQuery = attemptsQuery.gte('graded_at', from)
    if (to) attemptsQuery = attemptsQuery.lte('graded_at', to)

    const { data: attempts } = quizIds.length
        ? await attemptsQuery
        : { data: [] as { student_id: string; score: number | null; status: string }[] }

    const quizScoresByStudent = new Map<string, number[]>()
    for (const a of attempts ?? []) {
        if (a.score === null) continue
        const list = quizScoresByStudent.get(a.student_id) ?? []
        list.push(a.score)
        quizScoresByStudent.set(a.student_id, list)
    }

    function average(values: number[]): number | null {
        if (values.length === 0) return null
        return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
    }

    return students.map((student) => {
        const assignmentPcts = assignmentPercentagesByStudent.get(student.studentId) ?? []
        const quizScores = quizScoresByStudent.get(student.studentId) ?? []
        return {
            studentId: student.studentId,
            studentName: student.studentName,
            lessonsCompleted: completionsByStudent.get(student.studentId) ?? 0,
            totalLessons,
            assignmentAverage: average(assignmentPcts),
            assignmentCount: assignmentPcts.length,
            quizAverage: average(quizScores),
            quizCount: quizScores.length,
        }
    })
}
export type HeatmapStatus = 'graded' | 'returned' | 'submitted' | 'late' | 'missing' | 'not_due'

export type AssignmentHeatmap = {
    assignments: { id: string; title: string }[]
    students: { id: string; name: string }[]
    // Keyed as "studentId:assignmentId" for easy lookup in the grid.
    cells: Record<string, HeatmapStatus>
}

// Student × assignment status grid. One cell per pair: graded/returned
// if scored, submitted if turned in but ungraded, late if turned in
// past due_at, missing if due_at has passed with nothing submitted, or
// not_due if the deadline (or an undated assignment) hasn't passed yet.
export async function getAssignmentHeatmapForCourse(courseId: string): Promise<AssignmentHeatmap | null> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) return null

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active')

    const students = (enrollments ?? []).map((e: any) => ({
        id: e.student_id as string,
        name: (e.users?.full_name as string) ?? 'Unknown',
    }))

    const { data: assignmentRows } = await supabase
        .from('assignments')
        .select('id, title, due_at')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

    const assignments = (assignmentRows ?? []).map((a) => ({ id: a.id, title: a.title }))
    const assignmentIds = assignments.map((a) => a.id)
    const dueAtByAssignment = new Map((assignmentRows ?? []).map((a) => [a.id, a.due_at]))

    const { data: submissions } = assignmentIds.length
        ? await supabase
            .from('assignment_submissions')
            .select('student_id, assignment_id, status, is_late')
            .in('assignment_id', assignmentIds)
        : { data: [] as { student_id: string; assignment_id: string; status: string; is_late: boolean }[] }

    const submissionByKey = new Map((submissions ?? []).map((s) => [`${s.student_id}:${s.assignment_id}`, s]))

    const now = new Date()
    const cells: Record<string, HeatmapStatus> = {}

    for (const student of students) {
        for (const assignment of assignments) {
            const key = `${student.id}:${assignment.id}`
            const submission = submissionByKey.get(key)

            if (submission) {
                if (submission.is_late) {
                    cells[key] = 'late'
                } else if (submission.status === 'graded') {
                    cells[key] = 'graded'
                } else if (submission.status === 'returned') {
                    cells[key] = 'returned'
                } else {
                    cells[key] = 'submitted'
                }
                continue
            }

            const dueAt = dueAtByAssignment.get(assignment.id)
            cells[key] = dueAt && now > new Date(dueAt) ? 'missing' : 'not_due'
        }
    }

    return { assignments, students, cells }
}