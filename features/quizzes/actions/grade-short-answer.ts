'use server'
// See lib/auth/AUTH_NOTES.md for why these checks exist.
// Grading writes use supabaseAdmin — quiz_responses has no RLS policy
// letting a teacher UPDATE a response (responses_update only allows the
// student, and only while status = 'in_progress' — see DATABASE.md
// §quiz_responses policies). Reads use the normal client, since
// responses_select already allows the course teacher through
// is_course_teacher(). Same split as grade-quiz-submission.ts.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/get-current-user'

// Recomputes and finalizes an attempt's score once every short_answer
// response on it has been graded. Sums points_awarded across ALL
// responses (auto-graded + manually-graded) rather than recounting only
// auto-graded ones, since passing_score is compared against the full
// total, not a partial one. Every question currently has points = 1
// (see create-quiz.ts), so this stays equivalent to the old "correct
// count" logic once every question type funnels through points_awarded.
async function computeAttemptTotal(attemptId: string, supabase: any, supabaseAdmin: any) {
    const { data: responses, error } = await supabaseAdmin
        .from('quiz_responses')
        .select('points_awarded, is_correct, questions(question_type, points)')
        .eq('attempt_id', attemptId)

    if (error || !responses) return

    const stillPending = responses.some(
        (r: any) => r.questions.question_type === 'short_answer' && r.is_correct === null
    )
    if (stillPending) return // not every short_answer response is graded yet

    const totalPoints = responses.reduce((sum: number, r: any) => sum + (r.points_awarded ?? 0), 0)

    const { data: attempt } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, quizzes(passing_score)')
        .eq('id', attemptId)
        .single()

    const passingScore = (attempt as any)?.quizzes?.passing_score ?? 0
    const isPassing = totalPoints >= passingScore
    // Score shown to the student is still 0-100, consistent with
    // grade-quiz-submission.ts — total questions doubles as "max points"
    // since every question is worth 1 point today.
    const maxPoints = responses.length
    const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0

    const { data: gradedAttempt } = await supabase
        .from('quiz_attempts')
        .update({
            status: 'graded',
            score,
            is_passing: isPassing,
            graded_at: new Date().toISOString(),
        })
        .eq('id', attemptId)
        .select('student_id, quiz_id, quizzes(title, course_id)')
        .single()

    if (gradedAttempt) {
        const courseId = (gradedAttempt as any).quizzes?.course_id
        const quizId = (gradedAttempt as any).quiz_id
        await supabaseAdmin.from('notifications').insert({
            user_id: (gradedAttempt as any).student_id,
            // No dedicated 'quiz_graded' type exists yet in the notifications
            // CHECK constraint (database.md §3.18) — using 'general' rather
            // than adding a migration for this. Revisit if a proper type is
            // wanted later.
            type: 'general',
            title: 'Quiz graded',
            body: `Your quiz "${(gradedAttempt as any).quizzes?.title ?? ''}" has been graded.`,
            link: `/student/courses/${courseId}/quizzes/${quizId}/results`,
        })
    }
}

export type GradeShortAnswerResult = { ok: true } | { ok: false; error: string }

export async function gradeShortAnswer(
    attemptId: string,
    questionId: string,
    pointsAwarded: number,
    feedback?: string
): Promise<GradeShortAnswerResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const { data: attempt } = await supabase
        .from('quiz_attempts')
        .select('id, quizzes!inner(course_id, courses!inner(teacher_id))')
        .eq('id', attemptId)
        .single()

    if (!attempt || (attempt as any).quizzes.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this attempt.' }
    }

    const { data: response } = await supabase
        .from('quiz_responses')
        .select('id, questions!inner(question_type, points)')
        .eq('attempt_id', attemptId)
        .eq('question_id', questionId)
        .single()

    if (!response || (response as any).questions.question_type !== 'short_answer') {
        return { ok: false, error: 'This is not a short-answer question.' }
    }

    const maxPoints = (response as any).questions.points ?? 1
    const clampedPoints = Math.max(0, Math.min(pointsAwarded, maxPoints))

    // FIX (migration 063): this used to be a raw supabaseAdmin
    // .update() on quiz_responses. That looked safe (service-role
    // bypasses RLS) but missed that trg_prevent_late_response
    // (migration 060) requires quiz_attempts.status = 'in_progress'
    // for ANY update to quiz_responses, regardless of which client
    // issues it — service-role bypasses RLS, not triggers. By the time
    // a teacher grades a short-answer response the attempt is always
    // 'submitted'/'graded', so that update was silently rejected every
    // time, surfacing only as this function's generic error message.
    // grade_short_answer_response() sets a session-local flag the
    // trigger now checks for and skips its check when set — same
    // pattern as archive_delete_audit_logs()'s bypass of
    // prevent_audit_log_mutation(). Must go through the regular
    // (session-bound) client, not supabaseAdmin — the RPC's own
    // ownership check relies on auth.uid(), which resolves to null
    // under the service-role key.
    const { error: updateError } = await supabase.rpc('grade_short_answer_response', {
        p_attempt_id: attemptId,
        p_question_id: questionId,
        p_points_awarded: clampedPoints,
        p_feedback: feedback?.trim() || null,
    })

    if (updateError) {
        return { ok: false, error: `Could not save the grade: ${updateError.message}` }
    }

    await computeAttemptTotal(attemptId, supabase, supabaseAdmin)

    // Explicit call required — QUIZ_RESPONSE_GRADED is not one of the
    // events the fn_audit_log() DB trigger covers automatically
    // (see IMPLEMENTATION_READY.md's audit write-path table).
    await supabase.rpc('log_audit_event', {
        p_action: 'QUIZ_RESPONSE_GRADED',
        p_target_table: 'quiz_responses',
        p_target_id: (response as any).id,
        p_metadata: { attempt_id: attemptId, question_id: questionId, points_awarded: clampedPoints },
    })

    return { ok: true }
}

// Teacher-facing: every attempt for a quiz, flagged if it has any
// ungraded short_answer response, for the "Needs Grading" badge.
export async function listAttemptsForQuiz(quizId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) return null

    const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select(
            'id, status, score, is_passing, submitted_at, attempt_number, users!quiz_attempts_student_id_fkey(full_name), quiz_responses(is_correct, questions(question_type))'
        )
        .eq('quiz_id', quizId)
        .order('submitted_at', { ascending: false })

    return (attempts ?? []).map((a: any) => ({
        id: a.id,
        studentName: a.users?.full_name ?? 'Unknown student',
        status: a.status,
        score: a.score,
        isPassing: a.is_passing,
        submittedAt: a.submitted_at,
        attemptNumber: a.attempt_number,
        needsGrading: (a.quiz_responses ?? []).some(
            (r: any) => r.questions?.question_type === 'short_answer' && r.is_correct === null
        ),
    }))
}

// Teacher-facing: one attempt's short_answer responses, for grading.
export async function getAttemptForGrading(attemptId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: attempt } = await supabase
        .from('quiz_attempts')
        .select(
            'id, quiz_id, status, score, is_passing, users!quiz_attempts_student_id_fkey(full_name), quizzes!inner(title, course_id, courses!inner(teacher_id))'
        )
        .eq('id', attemptId)
        .single()

    if (!attempt || (attempt as any).quizzes.courses.teacher_id !== user.id) return null

    const { data: responses } = await supabase
        .from('quiz_responses')
        .select('id, question_id, text_response, is_correct, points_awarded, feedback, questions!inner(question_text, points, question_type)')
        .eq('attempt_id', attemptId)
        .eq('questions.question_type', 'short_answer')

    return {
        attempt: {
            id: attempt.id,
            quizId: (attempt as any).quiz_id,
            courseId: (attempt as any).quizzes.course_id,
            quizTitle: (attempt as any).quizzes.title,
            studentName: (attempt as any).users?.full_name ?? 'Unknown student',
            status: attempt.status,
            score: attempt.score,
            isPassing: attempt.is_passing,
        },
        responses: (responses ?? []).map((r: any) => ({
            id: r.id,
            questionId: r.question_id,
            questionText: r.questions.question_text,
            maxPoints: r.questions.points,
            textResponse: r.text_response,
            pointsAwarded: r.points_awarded,
            isGraded: r.is_correct !== null,
            feedback: r.feedback,
        })),
    }
}