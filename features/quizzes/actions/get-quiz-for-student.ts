// See lib/auth/AUTH_NOTES.md for why these checks exist
// See DATABASE.md section on answer_options_for_student for why this view is used

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'

/**
 * Loads a quiz so a student can take it.
 * This never returns is_correct. It cannot, because it only
 * reads from answer_options_for_student, a view that leaves
 * is_correct out completely. Even if this code has a mistake,
 * the database still refuses to hand back the answer key.
 */
export async function getQuizForStudent(quizId: string) {
    await requireRole(['student'])

    const supabase = await createClient()

    const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, description, course_id, passing_score, shuffle_questions, shuffle_options')
        .eq('id', quizId)
        .single()

    if (quizError || !quiz) {
        throw new Error('Quiz not found')
    }

    const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, quiz_id, question_text, question_type, order_index')
        .eq('quiz_id', quizId)
        .order('order_index')

    if (questionsError) {
        throw new Error('Could not load questions')
    }

    const questionIds = (questions ?? []).map((q) => q.id)

    const { data: options, error: optionsError } = await supabase
        .from('answer_options_for_student')
        .select('id, question_id, option_text, order_index')
        .in('question_id', questionIds)
        .order('order_index')

    if (optionsError) {
        throw new Error('Could not load answer options')
    }

    const questionsWithOptions = (questions ?? []).map((question) => ({
        ...question,
        options: (options ?? []).filter((o) => o.question_id === question.id),
    }))

    return {
        ...quiz,
        questions: questionsWithOptions,
    }
}

export type QuizAttemptSummary = {
    id: string
    status: string
    score: number | null
    isPassing: boolean | null
    submittedAt: string | null
    // Per-question detail, gated by the quiz's show_results_after
    // setting (migration 033) — same rule as grade-quiz-submission.ts.
    // Omitted (not null) for any question whose correctness isn't
    // allowed to be shown yet, for the same "don't leak that a hidden
    // field exists" reason documented in grade-quiz-submission.ts.
    questionResults: { questionId: string; isCorrect?: boolean }[]
}

export type QuizOverviewForStudent = {
    quiz: {
        id: string
        title: string
        description: string | null
        courseId: string
        maxAttempts: number
    }
    attemptCount: number
    latestAttempt: QuizAttemptSummary | null
    // True once attemptCount >= maxAttempts on a finished (non
    // in_progress) latest attempt — mirrors trg_check_max_attempts, but
    // computed here just to decide what button the page shows; the
    // trigger remains the actual enforcement if this is ever wrong.
    canStartNewAttempt: boolean
}

/**
 * Loads what the quiz details page needs: the quiz itself, plus whether
 * the student has an existing attempt and, if so, its result — gated by
 * show_results_after exactly like grade-quiz-submission.ts gates its
 * response at submit time. This is what closes the gap that gating: an
 * attempt's per-question correctness must stay hidden on every later
 * visit too, not just immediately after submitting.
 */
export async function getQuizOverviewForStudent(quizId: string): Promise<QuizOverviewForStudent> {
    await requireRole(['student'])
    const supabase = await createClient()

    const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, description, course_id, max_attempts, show_results_after')
        .eq('id', quizId)
        .single()

    if (quizError || !quiz) {
        throw new Error('Quiz not found')
    }

    const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('id, status, score, is_passing, submitted_at, attempt_number')
        .eq('quiz_id', quizId)
        .order('attempt_number', { ascending: false })

    if (attemptsError) {
        throw new Error('Could not load attempt history')
    }

    const attemptRows = attempts ?? []
    const latest = attemptRows[0] ?? null

    let latestAttempt: QuizAttemptSummary | null = null

    if (latest) {
        const isFullyGraded = latest.status === 'graded'
        const showDetail =
            quiz.show_results_after === 'immediately' ||
            (quiz.show_results_after === 'after_grading' && isFullyGraded)
        const neverShow = quiz.show_results_after === 'never'

        let questionResults: { questionId: string; isCorrect?: boolean }[] = []

        // Only fetch per-question results at all if there's a chance
        // we'll show them — an in_progress attempt has no responses to
        // show yet either way.
        if (latest.status !== 'in_progress' && !neverShow) {
            const { data: responses } = await supabase
                .from('quiz_responses')
                .select('question_id, is_correct')
                .eq('attempt_id', latest.id)

            questionResults = (responses ?? []).map((r) => {
                // is_correct is null for short_answer questions until a
                // teacher grades them, and for every question if this
                // whole attempt isn't graded yet under 'after_grading'.
                if (!showDetail || r.is_correct === null) {
                    return { questionId: r.question_id }
                }
                return { questionId: r.question_id, isCorrect: r.is_correct }
            })
        }

        latestAttempt = {
            id: latest.id,
            status: latest.status,
            // Aggregate score/isPassing follow the same gate as detail —
            // 'never' still shows pass/fail per the original design
            // (only per-question detail is withheld under 'never'), but
            // 'after_grading' withholds the aggregate too until graded,
            // matching what grade-quiz-submission.ts does at submit time.
            score: quiz.show_results_after === 'after_grading' && !isFullyGraded ? null : latest.score,
            isPassing: quiz.show_results_after === 'after_grading' && !isFullyGraded ? null : latest.is_passing,
            submittedAt: latest.submitted_at,
            questionResults,
        }
    }

    const canStartNewAttempt =
        latest === null ||
        latest.status === 'in_progress' ||
        attemptRows.filter((a) => a.status !== 'abandoned').length < quiz.max_attempts

    return {
        quiz: {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            courseId: quiz.course_id,
            maxAttempts: quiz.max_attempts,
        },
        attemptCount: attemptRows.length,
        latestAttempt,
        canStartNewAttempt,
    }
}