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
    wrongCount?: number
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

export type LearningInsights = {
    learningWellCount: number
    needsPracticeCount: number
    needsSupportCount: number
    commonDifficulty: {
        activityId: string
        prompt: string
        missionTitle: string
        courseName: string
        courseSubject: string | null
        wrongCountThisWeek: number
        href: string
    } | null
}

export async function getTeacherDashboardData() {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

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
            learningInsights: {
                learningWellCount: 0,
                needsPracticeCount: 0,
                needsSupportCount: 0,
                commonDifficulty: null,
            } as LearningInsights,
        }
    }

    const courseNameById = new Map(courseList.map((c) => [c.id, c.title]))
    const courseSubjectById = new Map(courseList.map((c) => [c.id, c.subject]))

    const [assignmentsResult, quizzesResult, studentsResult] = await Promise.all([
        supabase.from('assignments').select('id, title, course_id').in('course_id', courseIds),
        supabase.from('quizzes').select('id, title, course_id').in('course_id', courseIds),
        supabase
            .from('enrollments')
            .select('student_id')
            .in('course_id', courseIds)
            .eq('status', 'active'),
    ])

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
            : supabase
                  .from('activities')
                  .select('id, mission_id, activity_questions(prompt, order_index)')
                  .in('mission_id', missionIds),
    ])

    if (missionProgressResult.error) {
        console.error('teacher-dashboard missionProgressResult error:', missionProgressResult.error.message, missionProgressResult.error.code, missionProgressResult.error.details)
    }
    if (activitiesResult.error) {
        console.error('teacher-dashboard activitiesResult error:', activitiesResult.error.message, activitiesResult.error.code, activitiesResult.error.details)
    }

    const activityMissionId = new Map((activitiesResult.data ?? []).map((a) => [a.id, a.mission_id]))
    const activityPromptById = new Map(
    (activitiesResult.data ?? []).map((a: any) => {
        const sortedQuestions = [...(a.activity_questions ?? [])].sort(
            (x: any, y: any) => x.order_index - y.order_index
        )
        return [a.id, (sortedQuestions[0]?.prompt as string) ?? 'Activity']
    })
)
    const activityIds = [...activityMissionId.keys()]

    const { data: wrongEvents, error: wrongEventsError } =
        activityIds.length === 0
            ? { data: [] as any[], error: null }
            : await supabase
                  .from('attempt_events')
                  .select('activity_id, student_id, responded_at')
                  .in('activity_id', activityIds)
                  .eq('is_correct', false)

    if (wrongEventsError) {
        console.error('teacher-dashboard wrongEventsError:', wrongEventsError.message, wrongEventsError.code, wrongEventsError.details)
    }

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
            href: `/teacher/courses/${missionInfo?.courseId}/lessons/${missionInfo?.lessonId}/missions/${row.mission_id}/progress`,
            wrongCount: wrongCountByMissionStudent.get(`${row.mission_id}:${row.student_id}`) ?? 0,
        }
    })

    const attentionItems = [...submissionItems, ...shortAnswerItems, ...stuckItems].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )

    const { data: masteryRows, error: masteryRowsError } =
        activityIds.length === 0
            ? { data: [] as any[], error: null }
            : await supabase
                  .from('activity_mastery')
                  .select('student_id, activity_id, state, wrong_count')
                  .in('activity_id', activityIds)

    if (masteryRowsError) {
        console.error('teacher-dashboard masteryRowsError:', masteryRowsError.message, masteryRowsError.code, masteryRowsError.details)
    }

    const masteryRowsByStudent = new Map<string, { state: string; wrong_count: number }[]>()
    for (const row of masteryRows ?? []) {
        const list = masteryRowsByStudent.get(row.student_id) ?? []
        list.push({ state: row.state, wrong_count: row.wrong_count })
        masteryRowsByStudent.set(row.student_id, list)
    }

    let learningWellCount = 0
    let needsPracticeCount = 0
    let needsSupportCount = 0

    for (const rows of masteryRowsByStudent.values()) {
        const hasStruggle = rows.some((r) => r.wrong_count >= STUCK_WRONG_ATTEMPTS_THRESHOLD)
        const masteredFraction = rows.filter((r) => r.state === 'mastered').length / rows.length

        if (hasStruggle) {
            needsSupportCount += 1
        } else if (masteredFraction >= 0.7) {
            learningWellCount += 1
        } else {
            needsPracticeCount += 1
        }
    }

    const weeklyStartMs = Date.now() - 7 * 24 * 60 * 60 * 1000
    const weeklyWrongCountByActivity = new Map<string, number>()
    for (const event of wrongEvents ?? []) {
        if (new Date(event.responded_at).getTime() < weeklyStartMs) continue
        weeklyWrongCountByActivity.set(event.activity_id, (weeklyWrongCountByActivity.get(event.activity_id) ?? 0) + 1)
    }

    let commonDifficulty: LearningInsights['commonDifficulty'] = null
    for (const [activityId, count] of weeklyWrongCountByActivity.entries()) {
        if (!commonDifficulty || count > commonDifficulty.wrongCountThisWeek) {
            const missionId = activityMissionId.get(activityId)
            const missionInfo = missionId ? missionInfoById.get(missionId) : undefined
            if (!missionInfo || !missionInfo.courseId) continue
            commonDifficulty = {
                activityId,
                prompt: activityPromptById.get(activityId) ?? 'Activity',
                missionTitle: missionInfo.title,
                courseName: courseNameById.get(missionInfo.courseId) ?? 'Course',
                courseSubject: courseSubjectById.get(missionInfo.courseId) ?? null,
                wrongCountThisWeek: count,
                href: `/teacher/courses/${missionInfo.courseId}/lessons/${missionInfo.lessonId}/missions/${missionId}/edit`,
            }
        }
    }

    const learningInsights: LearningInsights = {
        learningWellCount,
        needsPracticeCount,
        needsSupportCount,
        commonDifficulty,
    }

    const stats: TeacherDashboardStats = {
        coursesCount: courseList.length,
        studentsCount: distinctStudentIds.size,
        needsGradingCount: submissionItems.length + shortAnswerItems.length,
        stuckStudentsCount: stuckItems.length,
    }

    const coursesPreview: TeacherCoursePreview[] = await (async () => {
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

    return { stats, attentionItems, coursesPreview, learningInsights }
}
