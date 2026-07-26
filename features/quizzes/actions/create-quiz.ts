'use server'
// Lets a teacher create a quiz inside a course, then add questions to
// it. Supports multiple choice (single), true/false, checklist
// (multiple correct options), and short answer (manual grading).

import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const createQuizSchema = z.object({
    courseId: z.string().uuid(),
    title: z.string().min(2, 'Title is too short'),
})

export type CreateQuizResult =
    | { ok: true; quizId: string }
    | { ok: false; error: string }

export async function createQuiz(formData: FormData): Promise<CreateQuizResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = createQuizSchema.safeParse({
        courseId: formData.get('courseId'),
        title: formData.get('title'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { courseId, title } = parsed.data

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false, error: 'You do not have access to this course.' }
    }

    const { data: quiz, error } = await supabase
        .from('quizzes')
        .insert({
            course_id: courseId,
            created_by: user.id,
            title,
            passing_score: 1,
            max_attempts: 1,
        })
        .select('id')
        .single()

    if (error || !quiz) {
        return { ok: false, error: 'Could not create the quiz. Please try again.' }
    }

    return { ok: true, quizId: quiz.id }
}

const addQuestionSchema = z.object({
    quizId: z.string().uuid(),
    questionText: z.string().min(2, 'Question is too short'),
    questionType: z.enum(['multiple_choice_single', 'true_false', 'checklist', 'short_answer']),
    // Comma separated option text, used for multiple choice and checklist.
    options: z.string().optional(),
    // For multiple_choice_single and true_false: one value.
    // For checklist: comma separated list of correct option texts.
    // For short_answer: the reference answer, used by the teacher during manual grading.
    correctAnswer: z.string().min(1, 'Enter the correct answer'),
})

export type AddQuestionResult =
    | { ok: true }
    | { ok: false; error: string }

// Adds one question, plus its answer options (if any), to a quiz.
export async function addQuestion(formData: FormData): Promise<AddQuestionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = addQuestionSchema.safeParse({
        quizId: formData.get('quizId'),
        questionText: formData.get('questionText'),
        questionType: formData.get('questionType'),
        // formData.get() returns null when a field isn't present in the
        // form at all (e.g. true_false/short_answer don't render an
        // "options" input) — Zod's .optional() only accepts undefined,
        // not null, so this normalizes null → undefined before parsing.
        options: formData.get('options') ?? undefined,
        correctAnswer: formData.get('correctAnswer'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { quizId, questionText, questionType, options, correctAnswer } = parsed.data

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, course_id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    // Short answer needs manual grading, so we store the reference
    // answer in the question's explanation field for the teacher to
    // see while grading. It does not auto-grade.
    const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
            quiz_id: quizId,
            question_text: questionText,
            question_type: questionType,
            points: 1,
            explanation: questionType === 'short_answer' ? correctAnswer : null,
        })
        .select('id')
        .single()

    if (questionError || !question) {
        return { ok: false, error: 'Could not save the question.' }
    }

    // Short answer has no answer options at all.
    if (questionType === 'short_answer') {
        return { ok: true }
    }

    let optionRows: { question_id: string; option_text: string; is_correct: boolean; order_index: number }[] = []

    if (questionType === 'true_false') {
        optionRows = [
            { question_id: question.id, option_text: 'True', is_correct: correctAnswer === 'True', order_index: 0 },
            { question_id: question.id, option_text: 'False', is_correct: correctAnswer === 'False', order_index: 1 },
        ]
    } else {
        const optionTexts = (options ?? '')
            .split(',')
            .map((text) => text.trim())
            .filter(Boolean)

        if (optionTexts.length < 2) {
            return { ok: false, error: 'Add at least two answer options, separated by commas.' }
        }

        if (questionType === 'checklist') {
            // Checklist allows more than one correct option, so we
            // compare against a comma separated list of correct answers.
            const correctSet = new Set(
                correctAnswer
                    .split(',')
                    .map((text) => text.trim())
                    .filter(Boolean)
            )

            optionRows = optionTexts.map((text, index) => ({
                question_id: question.id,
                option_text: text,
                is_correct: correctSet.has(text),
                order_index: index,
            }))
        } else {
            // multiple_choice_single: exactly one correct option.
            optionRows = optionTexts.map((text, index) => ({
                question_id: question.id,
                option_text: text,
                is_correct: text === correctAnswer,
                order_index: index,
            }))
        }
    }

    const { error: optionsError } = await supabase.from('answer_options').insert(optionRows)

    if (optionsError) {
        return { ok: false, error: 'Could not save the answer options.' }
    }

    return { ok: true }
}

// Loads a quiz and its questions, including each question's answer
// options, for the teacher to review while building it.
export async function getQuizForTeacher(quizId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, title, course_id, passing_score, is_published, time_limit_minutes, show_results_after, courses!inner(teacher_id, title)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return null
    }

    const { data: questions } = await supabase
        .from('questions')
        .select('id, question_text, question_type, order_index, explanation, answer_options(id, option_text, is_correct, order_index)')
        .eq('quiz_id', quizId)
        .order('order_index')

    const questionsWithSortedOptions = (questions ?? []).map((q: any) => ({
        ...q,
        answer_options: [...(q.answer_options ?? [])].sort((a, b) => a.order_index - b.order_index),
    }))

    return { quiz, questions: questionsWithSortedOptions }
}

// Lets a teacher set the passing score, once they know how many
// questions the quiz actually has.
export async function setPassingScore(quizId: string, passingScore: number) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false as const }
    }

    await supabase.from('quizzes').update({ passing_score: passingScore }).eq('id', quizId)

    return { ok: true as const }
}

// Lets a teacher turn the timer on/off, or change the minutes, after
// the quiz already exists. null means no timer.
export async function setTimeLimit(quizId: string, timeLimitMinutes: number | null) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false as const }
    }

    await supabase.from('quizzes').update({ time_limit_minutes: timeLimitMinutes }).eq('id', quizId)

    return { ok: true as const }
}

export type ResultsVisibility = 'immediately' | 'after_grading' | 'never'

// Lets a teacher control whether students see per-question correctness
// after submitting. See migration 033 for what each value means. This
// only changes what grade-quiz-submission.ts includes in its response
// going forward — it doesn't rewrite anything for attempts already
// submitted.
export async function setResultsVisibility(quizId: string, visibility: ResultsVisibility) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false as const }
    }

    await supabase.from('quizzes').update({ show_results_after: visibility }).eq('id', quizId)

    return { ok: true as const }
}

// Lets a teacher publish or unpublish a quiz.
export async function toggleQuizPublish(quizId: string, publish: boolean) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false as const }
    }

    await supabase.from('quizzes').update({ is_published: publish }).eq('id', quizId)

    return { ok: true as const }
}