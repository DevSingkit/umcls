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
        .select('id, title, description, course_id, passing_score')
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