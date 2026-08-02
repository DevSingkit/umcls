// See lib/auth/AUTH_NOTES.md for why these checks exist.
//
// Student-scoped counterpart to features/grades/queries/gradebook.ts.
// Not a reuse of those queries — those require ['teacher'] and query by
// courseId across all enrolled students; this queries by the logged-in
// student's own id only, which is a different shape, not just a
// filtered version of the same thing.

import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type MyAssignmentGrade = {
    submissionId: string | null
    assignmentId: string
    title: string
    maxScore: number
    score: number | null
    feedback: string | null
    status: string | null // null if never submitted
}

export type MyQuizGrade = {
    attemptId: string
    quizId: string
    title: string
    score: number | null
    isPassing: boolean | null
    status: string
    submittedAt: string | null
}

export async function getMyGradesForCourse(courseId: string): Promise<{
    assignments: MyAssignmentGrade[]
    quizzes: MyQuizGrade[]
} | null> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

    if (!enrollment) return null

    const { data: assignments } = await supabase
        .from('assignments')
        .select(
            'id, title, max_score, assignment_submissions(id, score, feedback, status, student_id)'
        )
        .eq('course_id', courseId)
        .eq('is_published', true)
        .is('deleted_at', null)

    const assignmentGrades: MyAssignmentGrade[] = (assignments ?? []).map((a: any) => {
        const mySubmission = (a.assignment_submissions ?? []).find(
            (s: any) => s.student_id === user.id
        )
        return {
            submissionId: mySubmission?.id ?? null,
            assignmentId: a.id,
            title: a.title,
            maxScore: a.max_score,
            score: mySubmission?.score ?? null,
            feedback: mySubmission?.feedback ?? null,
            status: mySubmission?.status ?? null,
        }
    })

    const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, quiz_attempts(id, score, is_passing, status, submitted_at, student_id)')
        .eq('course_id', courseId)
        .eq('is_published', true)

    const quizGrades: MyQuizGrade[] = []
    for (const q of quizzes ?? []) {
        const myAttempts = ((q as any).quiz_attempts ?? []).filter(
            (a: any) => a.student_id === user.id
        )
        // A student can have more than one attempt if max_attempts > 1 —
        // show the most recent one here, same "latest counts" idea used
        // elsewhere (e.g. resubmission replacing the prior grade).
        const latest = myAttempts.sort(
            (a: any, b: any) => new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime()
        )[0]

        if (latest) {
            quizGrades.push({
                attemptId: latest.id,
                quizId: q.id,
                title: q.title,
                score: latest.score,
                isPassing: latest.is_passing,
                status: latest.status,
                submittedAt: latest.submitted_at,
            })
        }
    }

    return { assignments: assignmentGrades, quizzes: quizGrades }
}

// Student-scoped counterpart to gradebook.ts's getDepEdGradesForCourse
// — same DepEd Matatag weighted computation (migration 057), confirmed
// against DepEd Order 8, s.2015's real steps: percentage score per
// item, averaged per component (Written Work / Performance Task /
// Quarterly Assessment, pooling assignments and quizzes together), then
// combined via the subject's weight profile. See gradebook.ts for the
// full reasoning — not duplicated here beyond what differs.
//
// Deliberately a separate query, not a call into the teacher-scoped
// function with a filter — same reasoning the file's own header comment
// already gives for getMyGradesForCourse vs getGradebookForCourseInRange:
// different required role, different shape, not just a filtered version
// of the same thing.
export type MyDepEdGrade = {
    writtenWorkAvg: number | null
    performanceTaskAvg: number | null
    quarterlyAssessmentAvg: number | null
    initialGrade: number | null
    weightProfile: 'default' | 'mapeh'
}

type ComponentType = 'written_work' | 'performance_task' | 'quarterly_assessment'

function resolveWeightProfileKey(subject: string | null): 'default' | 'mapeh' {
    return subject?.trim().toLowerCase() === 'mapeh' ? 'mapeh' : 'default'
}

export async function getMyDepEdGradeForCourse(courseId: string): Promise<MyDepEdGrade | null> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

    if (!enrollment) return null

    const { data: course } = await supabase
        .from('courses')
        .select('subject')
        .eq('id', courseId)
        .single()

    const weightProfileKey = resolveWeightProfileKey(course?.subject ?? null)

    const { data: weightProfile } = await supabase
        .from('subject_weight_profiles')
        .select('written_work_pct, performance_task_pct, quarterly_assessment_pct')
        .eq('profile_key', weightProfileKey)
        .single()

    // Same safe fallback as gradebook.ts — should never trigger
    // post-migration-057, but a missing profile row must never silently
    // produce a 0% grade.
    const weights = weightProfile ?? { written_work_pct: 20, performance_task_pct: 50, quarterly_assessment_pct: 30 }

    const { data: assignments } = await supabase
        .from('assignments')
        .select('id, max_score, grading_component, assignment_submissions(score, status, student_id)')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .is('deleted_at', null)

    const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, grading_component, quiz_attempts(score, status, student_id)')
        .eq('course_id', courseId)
        .eq('is_published', true)

    const buckets: Record<ComponentType, number[]> = {
        written_work: [],
        performance_task: [],
        quarterly_assessment: [],
    }

    for (const a of assignments ?? []) {
        const mySubmission = ((a as any).assignment_submissions ?? []).find(
            (s: any) => s.student_id === user.id && (s.status === 'graded' || s.status === 'returned')
        )
        if (!mySubmission || mySubmission.score === null) continue
        const pct = a.max_score > 0 ? (mySubmission.score / a.max_score) * 100 : 0
        buckets[a.grading_component as ComponentType].push(pct)
    }

    for (const q of quizzes ?? []) {
        const myAttempts = ((q as any).quiz_attempts ?? []).filter(
            (att: any) => att.student_id === user.id && att.status === 'graded'
        )
        // Same "latest attempt counts" rule as getMyGradesForCourse
        // above — a resubmission/retake replaces the prior grade, it
        // doesn't average in alongside it.
        const latest = myAttempts.sort(
            (a: any, b: any) => new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime()
        )[0]
        if (!latest || latest.score === null) continue
        buckets[q.grading_component as ComponentType].push(latest.score)
    }

    function average(values: number[]): number | null {
        if (values.length === 0) return null
        return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
    }

    const writtenWorkAvg = average(buckets.written_work)
    const performanceTaskAvg = average(buckets.performance_task)
    const quarterlyAssessmentAvg = average(buckets.quarterly_assessment)

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
        writtenWorkAvg,
        performanceTaskAvg,
        quarterlyAssessmentAvg,
        initialGrade,
        weightProfile: weightProfileKey,
    }
}
