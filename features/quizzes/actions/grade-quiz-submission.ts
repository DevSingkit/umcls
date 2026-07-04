// See lib/auth/AUTH_NOTES.md for why these checks exist
// See DATABASE.md section on answer_options for why the service role client is used here
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'
type StudentAnswer = {
    questionId: string
    selectedOptionIds: string[]
}
/**
 * Grades a quiz after the student submits it.
 * This is the only place that reads the real answer key.
 * It runs on the server and uses the service role client, which
 * is the one client allowed to see is_correct. The student's
 * browser never receives this data, only the final result below.
 */
export async function gradeQuizSubmission(
    quizId: string,
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
        .select('id, passing_score')
        .eq('id', quizId)
        .single()
    if (quizError || !quiz) {
        throw new Error('Quiz not found or not accessible')
    }
    const questionIds = studentAnswers.map((a) => a.questionId)
    // Only here, using the admin client, do we ever load is_correct.
    const { data: correctOptions, error: correctError } = await supabaseAdmin
        .from('answer_options')
        .select('id, question_id, is_correct')
        .in('question_id', questionIds)
    if (correctError) {
        throw new Error('Could not grade quiz')
    }
    let correctCount = 0
    const results = studentAnswers.map((answer) => {
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
        }
    })
    const score = Math.round((correctCount / studentAnswers.length) * 100)
    const isPassing = score >= quiz.passing_score
    const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
            quiz_id: quizId,
            student_id: user?.id,
            score,
            is_passing: isPassing,
        })
        .select('id')
        .single()
    if (attemptError) {
        throw new Error('Could not save quiz attempt')
    }
    return {
        attemptId: attempt.id,
        score,
        isPassing,
        results,
    }
}