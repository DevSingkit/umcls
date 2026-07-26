'use server'
// See lib/auth/AUTH_NOTES.md for why these checks exist.
// Read-only dashboard queries. requireRole first (loud failure if a
// non-teacher somehow reaches this), then every query is additionally
// scoped to courses.teacher_id = user.id so a teacher can never see
// another teacher's data even if a query were misused elsewhere.

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'

export type TeacherDashboardStats = {
    coursesCount: number
    studentsCount: number
    needsGradingCount: number
}

export type AttentionItem = {
    id: string
    kind: 'assignment_submission' | 'quiz_short_answer'
    title: string
    courseName: string
    studentName: string
    submittedAt: string
    href: string
}

export type TeacherCoursePreview = {
    id: string
    title: string
    subject: string | null
}

// One combined fetch so the dashboard page makes a single call and all
// three sections (stats, needs-attention, courses preview) stay in sync
// with each other, rather than racing separate requests.
export async function getTeacherDashboardData() {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    // Every course this teacher owns. Used to scope all the queries below,
    // and to build the courses-preview list.
    const { data: courses } = await supabase
        .from('courses')
        .select('id, title, subject, created_at')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    const courseList = courses ?? []
    const courseIds = courseList.map((c) => c.id)

    if (courseIds.length === 0) {
        return {
            stats: { coursesCount: 0, studentsCount: 0, needsGradingCount: 0 } as TeacherDashboardStats,
            attentionItems: [] as AttentionItem[],
            coursesPreview: [] as TeacherCoursePreview[],
        }
    }

    const courseNameById = new Map(courseList.map((c) => [c.id, c.title]))

    // Get assignment/quiz ids scoped to this teacher's courses first,
    // rather than filtering through a joined table — Supabase applies
    // .in()/.eq() on an embedded relation to that relation's own rows,
    // not as a row-level filter on the parent select, so this two-step
    // shape is the safe one (matches how courses.ts and
    // grade-short-answer.ts scope every query: base-table id first,
    // then use that id list directly).
    const [assignmentsResult, quizzesResult, studentsResult] = await Promise.all([
        supabase.from('assignments').select('id, title, course_id').in('course_id', courseIds),
        supabase.from('quizzes').select('id, title, course_id').in('course_id', courseIds),
        supabase
            .from('enrollments')
            .select('student_id')
            .in('course_id', courseIds)
            .eq('status', 'active'),
    ])

    const assignmentById = new Map((assignmentsResult.data ?? []).map((a) => [a.id, a]))
    const quizById = new Map((quizzesResult.data ?? []).map((q) => [q.id, q]))
    const assignmentIds = [...assignmentById.keys()]
    const quizIds = [...quizById.keys()]

    const [submissionsResult, shortAnswerResult] = await Promise.all([
        // Ungraded assignment submissions, scoped to this teacher's
        // assignment ids directly.
        assignmentIds.length === 0
            ? Promise.resolve({ data: [] as any[] })
            : supabase
                  .from('assignment_submissions')
                  .select(
                      'id, submitted_at, assignment_id, users!assignment_submissions_student_id_fkey(full_name)'
                  )
                  .in('assignment_id', assignmentIds)
                  .in('status', ['submitted', 'resubmitted'])
                  .order('submitted_at', { ascending: false }),

        // Quiz attempts with at least one ungraded short_answer response,
        // scoped to this teacher's quiz ids directly. quiz_responses has
        // no course_id of its own, so it's still nested here for the
        // "any ungraded short_answer" check, but the outer filter is on
        // quiz_id, not on a joined column.
        quizIds.length === 0
            ? Promise.resolve({ data: [] as any[] })
            : supabase
                  .from('quiz_attempts')
                  .select(
                      'id, submitted_at, quiz_id, users!quiz_attempts_student_id_fkey(full_name), quiz_responses(is_correct, questions(question_type))'
                  )
                  .in('quiz_id', quizIds)
                  .eq('status', 'submitted')
                  .order('submitted_at', { ascending: false }),
    ])

    const distinctStudentIds = new Set((studentsResult.data ?? []).map((e) => e.student_id))

    const submissionItems: AttentionItem[] = (submissionsResult.data ?? []).map((s: any) => {
        const assignment = assignmentById.get(s.assignment_id)
        return {
            id: s.id,
            kind: 'assignment_submission' as const,
            title: assignment?.title ?? 'Assignment',
            courseName: courseNameById.get(assignment?.course_id) ?? 'Course',
            studentName: s.users?.full_name ?? 'A student',
            submittedAt: s.submitted_at,
            href: `/teacher/courses/${assignment?.course_id}/assignments/${s.assignment_id}`,
        }
    })

    const ungradedAttempts = (shortAnswerResult.data ?? []).filter((a: any) =>
        (a.quiz_responses ?? []).some(
            (r: any) => r.questions?.question_type === 'short_answer' && r.is_correct === null
        )
    )

    const shortAnswerItems: AttentionItem[] = ungradedAttempts.map((a: any) => {
        const quiz = quizById.get(a.quiz_id)
        return {
            id: a.id,
            kind: 'quiz_short_answer' as const,
            title: quiz?.title ?? 'Quiz',
            courseName: courseNameById.get(quiz?.course_id) ?? 'Course',
            studentName: a.users?.full_name ?? 'A student',
            submittedAt: a.submitted_at,
            href: `/teacher/courses/${quiz?.course_id}/quizzes/${a.quiz_id}/attempts/${a.id}`,
        }
    })

    const attentionItems = [...submissionItems, ...shortAnswerItems].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )

    const stats: TeacherDashboardStats = {
        coursesCount: courseList.length,
        studentsCount: distinctStudentIds.size,
        needsGradingCount: submissionItems.length + shortAnswerItems.length,
    }

    const coursesPreview: TeacherCoursePreview[] = courseList.slice(0, 4).map((c) => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
    }))

    return { stats, attentionItems, coursesPreview }
}
