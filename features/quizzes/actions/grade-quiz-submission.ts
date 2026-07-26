'use server'
// See lib/auth/AUTH_NOTES.md for why these checks exist
// See DATABASE.md section on answer_options for why the service role client is used here
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'

type StudentAnswer = {
    questionId: string
    selectedOptionIds: string[]
    // Only meaningful for short_answer questions. Empty string for
    // every other question type — TakeQuizForm always sends this key.
    textResponse: string
}

/**
 * Grades a quiz after the student submits it.
 * This is the only place that reads the real answer key.
 * It runs on the server and uses the service role client, which
 * is the one client allowed to see is_correct. The student's
 * browser never receives this data, only the final result below.
 *
 * short_answer questions are never auto-graded — they need a human.
 * Their is_correct stays null and their points are excluded from the
 * score shown right after submission. If the quiz has any short_answer
 * questions, the attempt is left in 'submitted' status (not 'graded')
 * until a teacher grades them, and score/is_passing stay null until then.
 */
export async function gradeQuizSubmission(
    quizId: string,
    attemptId: string,
    studentAnswers: StudentAnswer[]
) {
    await requireRole(['student'])
    const user = await getCurrentUser()
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Confirm the student is actually enrolled and allowed to take this quiz.
    // This uses the normal, RLS-protected client on purpose, so a student
    // cannot grade a quiz they have no access to.
    const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('id, passing_score, available_until, show_results_after')
        .eq('id', quizId)
        .single()
    if (quizError || !quiz) {
        throw new Error('Quiz not found or not accessible')
    }

    // Confirm this attempt actually belongs to this student, on this
    // quiz, and is still open. attempts_update_student (DATABASE.md RLS)
    // already restricts updates to the owning student while
    // status = 'in_progress', but checking here first lets us return a
    // clear error instead of a confusing failed-update below.
    const { data: attempt, error: attemptFetchError } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, student_id, status')
        .eq('id', attemptId)
        .single()

    if (
        attemptFetchError ||
        !attempt ||
        attempt.quiz_id !== quizId ||
        attempt.student_id !== user?.id
    ) {
        throw new Error('Attempt not found or not accessible')
    }
    if (attempt.status !== 'in_progress') {
        throw new Error('This attempt has already been submitted.')
    }

    // Belt-and-suspenders: prevent_response_after_expiry (§7.8) blocks
    // quiz_responses writes past the time limit, but nothing at the DB
    // layer stops a submission arriving after available_until closes.
    // Re-check it here rather than trusting the client's countdown.
    if (quiz.available_until && new Date() > new Date(quiz.available_until)) {
        throw new Error('The availability window for this quiz has closed.')
    }

    const questionIds = studentAnswers.map((a) => a.questionId)

    // Need question_type here too, to know which questions are
    // short_answer (skip auto-grading) vs everything else.
    const { data: questionRows, error: questionRowsError } = await supabaseAdmin
        .from('questions')
        .select('id, question_type')
        .in('id', questionIds)
    if (questionRowsError) {
        throw new Error('Could not grade quiz')
    }
    const questionTypeById = new Map(
        (questionRows ?? []).map((q) => [q.id, q.question_type])
    )

    // Only here, using the admin client, do we ever load is_correct.
    const { data: correctOptions, error: correctError } = await supabaseAdmin
        .from('answer_options')
        .select('id, question_id, is_correct')
        .in('question_id', questionIds)
    if (correctError) {
        throw new Error('Could not grade quiz')
    }

    let correctCount = 0
    let autoGradableCount = 0
    let hasPendingManualGrading = false

    const results = studentAnswers.map((answer) => {
        const questionType = questionTypeById.get(answer.questionId)

        if (questionType === 'short_answer') {
            hasPendingManualGrading = true
            // Never scored here. A teacher grades this later.
            return {
                questionId: answer.questionId,
                isCorrect: null as boolean | null,
                pendingManualGrading: true,
            }
        }

        autoGradableCount += 1

        const optionsForQuestion = (correctOptions ?? []).filter(
            (o) => o.question_id === answer.questionId
        )
        const correctIds = optionsForQuestion
            .filter((o) => o.is_correct)
            .map((o) => o.id)
            .sort()
        const selectedIds = [...answer.selectedOptionIds].sort()
        const isCorrect =
            correctIds.length === selectedIds.length &&
            correctIds.every((id, i) => id === selectedIds[i])

        if (isCorrect) correctCount += 1

        // Only pass/fail comes back, never which option was actually correct.
        return {
            questionId: answer.questionId,
            isCorrect,
            pendingManualGrading: false,
        }
    })

    // Score is based only on auto-gradable questions. If every question
    // is short_answer (unusual, but possible), there's nothing to score
    // yet — leave it null rather than dividing by zero.
    const score =
        autoGradableCount > 0
            ? Math.round((correctCount / autoGradableCount) * 100)
            : null

    // passing_score is a raw "correct answers needed" count (e.g. 6 out of 10),
    // not a percentage — compare it against correctCount, not the 0-100 score.
    // While any short_answer question is still ungraded, we don't know the
    // final correctCount yet, so pass/fail can't be decided.
    const isPassing = hasPendingManualGrading
        ? null
        : correctCount >= quiz.passing_score

    // Persist each answer as a quiz_responses row BEFORE flipping the
    // attempt's status. This order matters: responses_update / the
    // prevent-late-response trigger both require quiz_attempts.status =
    // 'in_progress' to allow the write. Flipping status to
    // graded/submitted first (the previous, buggy order) caused every
    // real submission to silently fail here with "Attempt is not in
    // progress (graded/submitted). Responses cannot be modified." —
    // the attempt looked "done" but held zero real answers underneath.
    const responseRows = studentAnswers.map((answer) => {
        const questionType = questionTypeById.get(answer.questionId)
        const result = results.find((r) => r.questionId === answer.questionId)

        if (questionType === 'short_answer') {
            return {
                attempt_id: attemptId,
                question_id: answer.questionId,
                selected_option_id: null,
                selected_option_ids: null,
                text_response: answer.textResponse || null,
                is_correct: null,
                points_awarded: null,
            }
        }

        const isChecklist = questionType === 'checklist'

        return {
            attempt_id: attemptId,
            question_id: answer.questionId,
            selected_option_id: isChecklist ? null : answer.selectedOptionIds[0] ?? null,
            selected_option_ids: isChecklist ? answer.selectedOptionIds : null,
            text_response: null,
            is_correct: result?.isCorrect ?? null,
            points_awarded: result?.isCorrect ? 1 : 0,
        }
    })

    // Upsert, not insert: autosave (saveQuizAnswer) may have already
    // created a row for some or all of these questions while the
    // student was working through the quiz. This overwrites those rows
    // with the final graded result (is_correct/points_awarded), which
    // autosave never sets.
    const { error: responsesError } = await supabaseAdmin
        .from('quiz_responses')
        .upsert(responseRows, { onConflict: 'attempt_id,question_id' })
    if (responsesError) {
        console.error('quiz_responses upsert failed:', responsesError)
        throw new Error('Could not save quiz answers')
    }

    // Only now, with every response safely written while status was
    // still 'in_progress', do we flip the attempt to its final state.
    const attemptStatus = hasPendingManualGrading ? 'submitted' : 'graded'

    const { error: attemptUpdateError } = await supabase
        .from('quiz_attempts')
        .update({
            status: attemptStatus,
            submitted_at: new Date().toISOString(),
            score: hasPendingManualGrading ? null : score,
            is_passing: isPassing,
            graded_at: hasPendingManualGrading ? null : new Date().toISOString(),
        })
        .eq('id', attemptId)
    if (attemptUpdateError) {
        throw new Error('Could not save quiz attempt')
    }

    // Whether isCorrect is safe to hand back to this student's browser
    // right now depends on the teacher's setting (migration 033):
    //   'immediately'    — always fine, for any question already graded
    //                       (i.e. not pendingManualGrading).
    //   'after_grading'  — only once the whole attempt is fully graded —
    //                       i.e. no short_answer question is still
    //                       waiting on a teacher. Until then, omit it
    //                       entirely, even for the auto-graded questions,
    //                       so nothing trickles out early.
    //   'never'          — omit isCorrect always. Only score/isPassing
    //                       (aggregate) are ever returned.
    //
    // Omitting the key entirely (not setting it to null) matters here:
    // a null still confirms "this field exists and is hidden right now,"
    // which is itself a signal. Leaving it out entirely gives nothing.
    const canRevealNow =
        quiz.show_results_after === 'immediately' ||
        (quiz.show_results_after === 'after_grading' && !hasPendingManualGrading)

    const exposedResults = results.map((r) => {
        if (quiz.show_results_after === 'never' || !canRevealNow || r.pendingManualGrading) {
            return { questionId: r.questionId, pendingManualGrading: r.pendingManualGrading }
        }
        return { questionId: r.questionId, isCorrect: r.isCorrect, pendingManualGrading: r.pendingManualGrading }
    })

    return {
        attemptId,
        score,
        isPassing,
        pendingManualGrading: hasPendingManualGrading,
        results: exposedResults,
    }
}