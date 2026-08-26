'use server'
// See lib/auth/AUTH_NOTES.md for why these checks exist.
// Read-only dashboard queries. requireRole first (loud failure if a
// non-teacher somehow reaches this), then every query is additionally
// scoped to courses.teacher_id = user.id so a teacher can never see
// another teacher's data even if a query were misused elsewhere.

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'

// Neither of these was given a concrete number anywhere in HANDOFF.md
// ("many wrong attempt_events", "for a long time") — picked as
// reasonable defaults this session, not verified against any product
// decision. Easy to retune, just numbers.
const STUCK_WRONG_ATTEMPTS_THRESHOLD = 3
const STUCK_STALE_HOURS = 48

export type TeacherDashboardStats = {
    coursesCount: number
    studentsCount: number
    needsGradingCount: number
    // Kept separate from needsGradingCount on purpose — a stuck-mission
    // student doesn't need grading, they need help, so folding this
    // into needsGradingCount would misdescribe what that number means.
    stuckStudentsCount: number
}

export type AttentionItem = {
    id: string
    kind: 'assignment_submission' | 'quiz_short_answer' | 'mission_stuck'
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
    description: string | null
    isPublished: boolean
    teacherName: string | null
    teacherAvatarUrl: string | null
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
        .select('id, title, subject, description, is_published, created_at')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    const courseList = courses ?? []
    const courseIds = courseList.map((c) => c.id)

    if (courseIds.length === 0) {
        return {
            stats: { coursesCount: 0, studentsCount: 0, needsGradingCount: 0, stuckStudentsCount: 0 } as TeacherDashboardStats,
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

    // Same silent-swallow risk as the submissions/short-answer queries
    // below — if assignmentIds ends up empty when it shouldn't, this is
    // the query to check first, since everything else short-circuits
    // off of it.
    if (assignmentsResult.error) {
        console.error('teacher-dashboard assignmentsResult error:', assignmentsResult.error.message, assignmentsResult.error.code, assignmentsResult.error.details)
    }
    if (quizzesResult.error) {
        console.error('teacher-dashboard quizzesResult error:', quizzesResult.error.message, quizzesResult.error.code, quizzesResult.error.details)
    }

    const assignmentById = new Map((assignmentsResult.data ?? []).map((a) => [a.id, a]))
    const quizById = new Map((quizzesResult.data ?? []).map((q) => [q.id, q]))
    const assignmentIds = [...assignmentById.keys()]
    const quizIds = [...quizById.keys()]

    const [submissionsResult, shortAnswerResult] = await Promise.all([
        // Ungraded assignment submissions, scoped to this teacher's
        // assignment ids directly.
        assignmentIds.length === 0
            ? Promise.resolve({ data: [] as any[], error: null })
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
        //
        // FIX: previously filtered .eq('status', 'submitted'), on the
        // assumption an attempt with a still-ungraded short-answer
        // response always sits at status = 'submitted' until a teacher
        // grades it. That assumption is wrong in practice — an attempt
        // can already show status = 'graded' (and even a computed
        // score) while a short-answer response on it still has
        // is_correct = null, which silently dropped it off this list.
        // The real, reliable signal is the response's own is_correct,
        // same source of truth already used by grade-short-answer.ts's
        // listAttemptsForQuiz — status is not. Broadened to both
        // 'submitted' and 'graded' rather than dropping the filter
        // entirely, so a quiz still genuinely in_progress (student
        // hasn't finished yet, autosaved rows with no grading decided
        // either way) doesn't show up here prematurely.
        quizIds.length === 0
            ? Promise.resolve({ data: [] as any[], error: null })
            : supabase
                  .from('quiz_attempts')
                  .select(
                      'id, submitted_at, quiz_id, users!quiz_attempts_student_id_fkey(full_name), quiz_responses(is_correct, questions(question_type))'
                  )
                  .in('quiz_id', quizIds)
                  .in('status', ['submitted', 'graded'])
                  .order('submitted_at', { ascending: false }),
    ])

    // Was silently swallowed via ?? [] with no error check at all —
    // same class of bug as the deactivateUser/toggleQuizPublish fixes
    // found earlier this session, just on the read side instead of
    // write. Logging here so a real query error (as opposed to a
    // genuinely empty result) is visible instead of looking identical
    // to "nothing needs grading."
    if (submissionsResult.error) {
        console.error('teacher-dashboard submissionsResult error:', submissionsResult.error.message, submissionsResult.error.code, submissionsResult.error.details)
    }
    if (shortAnswerResult.error) {
        console.error('teacher-dashboard shortAnswerResult error:', shortAnswerResult.error.message, shortAnswerResult.error.code, shortAnswerResult.error.details)
    }

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

    // Mission-stuck students — same two-step id-scoping shape as
    // assignments/quizzes above: lessons for this teacher's courses
    // first, then missions scoped to those lesson ids, then
    // mission_progress/attempt_events scoped to those mission/activity
    // ids. Four queries deep because mission_progress has no course_id
    // of its own (mirrors quiz_responses' lack of one, noted above).
    const { data: lessonRows, error: lessonRowsError } = await supabase
        .from('lessons')
        .select('id, course_id')
        .in('course_id', courseIds)

    if (lessonRowsError) {
        console.error('teacher-dashboard lessonRowsError:', lessonRowsError.message, lessonRowsError.code, lessonRowsError.details)
    }

    const lessonCourseId = new Map((lessonRows ?? []).map((l) => [l.id, l.course_id]))
    const lessonIds = [...lessonCourseId.keys()]

    const { data: missionRows, error: missionRowsError } =
        lessonIds.length === 0
            ? { data: [] as any[], error: null }
            : await supabase
                  .from('missions')
                  .select('id, title, lesson_id, mastery_threshold')
                  .in('lesson_id', lessonIds)
                  .eq('is_published', true)

    if (missionRowsError) {
        console.error('teacher-dashboard missionRowsError:', missionRowsError.message, missionRowsError.code, missionRowsError.details)
    }

    const missionInfoById = new Map(
        (missionRows ?? []).map((m) => [
            m.id,
            {
                title: m.title as string,
                lessonId: m.lesson_id as string,
                courseId: lessonCourseId.get(m.lesson_id) ?? null,
            },
        ])
    )
    const missionIds = [...missionInfoById.keys()]

    const [missionProgressResult, activitiesResult] = await Promise.all([
        missionIds.length === 0
            ? Promise.resolve({ data: [] as any[], error: null })
            : supabase
                  .from('mission_progress')
                  .select(
                      'id, mission_id, student_id, status, correct_streak, updated_at, users!mission_progress_student_id_fkey(full_name)'
                  )
                  .in('mission_id', missionIds)
                  .eq('status', 'unlocked'),
        missionIds.length === 0
            ? Promise.resolve({ data: [] as any[], error: null })
            : supabase.from('activities').select('id, mission_id').in('mission_id', missionIds),
    ])

    if (missionProgressResult.error) {
        console.error('teacher-dashboard missionProgressResult error:', missionProgressResult.error.message, missionProgressResult.error.code, missionProgressResult.error.details)
    }
    if (activitiesResult.error) {
        console.error('teacher-dashboard activitiesResult error:', activitiesResult.error.message, activitiesResult.error.code, activitiesResult.error.details)
    }

    const activityMissionId = new Map((activitiesResult.data ?? []).map((a) => [a.id, a.mission_id]))
    const activityIds = [...activityMissionId.keys()]

    const { data: wrongEvents, error: wrongEventsError } =
        activityIds.length === 0
            ? { data: [] as any[], error: null }
            : await supabase
                  .from('attempt_events')
                  .select('activity_id, student_id')
                  .in('activity_id', activityIds)
                  .eq('is_correct', false)

    if (wrongEventsError) {
        console.error('teacher-dashboard wrongEventsError:', wrongEventsError.message, wrongEventsError.code, wrongEventsError.details)
    }

    // Wrong-attempt count per (mission, student), built once here rather
    // than queried per-row, so this stays a fixed number of round trips
    // regardless of how many students are currently "unlocked" across
    // this teacher's courses.
    const wrongCountByMissionStudent = new Map<string, number>()
    for (const event of wrongEvents ?? []) {
        const missionId = activityMissionId.get(event.activity_id)
        if (!missionId) continue
        const key = `${missionId}:${event.student_id}`
        wrongCountByMissionStudent.set(key, (wrongCountByMissionStudent.get(key) ?? 0) + 1)
    }

    const staleCutoffMs = Date.now() - STUCK_STALE_HOURS * 60 * 60 * 1000

    const stuckRows = (missionProgressResult.data ?? []).filter((row: any) => {
        const wrongCount = wrongCountByMissionStudent.get(`${row.mission_id}:${row.student_id}`) ?? 0
        const isStale = new Date(row.updated_at).getTime() < staleCutoffMs
        // "Stuck" here means either a real volume of wrong answers, or
        // sitting at zero streak with no progress in a while — either
        // one alone is enough, not both required.
        return wrongCount >= STUCK_WRONG_ATTEMPTS_THRESHOLD || (isStale && row.correct_streak === 0)
    })

    const stuckItems: AttentionItem[] = stuckRows.map((row: any) => {
        const missionInfo = missionInfoById.get(row.mission_id)
        return {
            id: row.id,
            kind: 'mission_stuck' as const,
            title: missionInfo?.title ?? 'Mission',
            courseName: courseNameById.get(missionInfo?.courseId) ?? 'Course',
            studentName: row.users?.full_name ?? 'A student',
            submittedAt: row.updated_at,
            href: `/teacher/courses/${missionInfo?.courseId}/lessons/${missionInfo?.lessonId}/missions/${row.mission_id}/edit`,
        }
    })

    const attentionItems = [...submissionItems, ...shortAnswerItems, ...stuckItems].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )

    const stats: TeacherDashboardStats = {
        coursesCount: courseList.length,
        studentsCount: distinctStudentIds.size,
        needsGradingCount: submissionItems.length + shortAnswerItems.length,
        stuckStudentsCount: stuckItems.length,
    }

    const coursesPreview: TeacherCoursePreview[] = await (async () => {
        // Every course here is already scoped to teacher_id = user.id
        // above, so there's exactly one teacher across all of them —
        // the logged-in user. One lookup, reused for every card, rather
        // than a per-course join for something that never varies.
        //
        // No longer sliced to a preview count — with the standalone
        // My Courses page removed, this grid is the only place a
        // teacher's classes are listed at all, not a capped preview of
        // a fuller list elsewhere.
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error('teacher-dashboard profileError:', profileError.message, profileError.code, profileError.details)
        }

        return courseList.map((c) => ({
            id: c.id,
            title: c.title,
            subject: c.subject,
            description: c.description,
            isPublished: c.is_published,
            teacherName: profile?.full_name ?? null,
            teacherAvatarUrl: profile?.avatar_url ?? null,
        }))
    })()

    return { stats, attentionItems, coursesPreview }
}
