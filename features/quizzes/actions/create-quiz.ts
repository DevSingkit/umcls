'use server'
// Lets a teacher create a quiz inside a course, then add questions to
// it. V1 only supports multiple choice with one correct answer, and
// true or false. No timer, no shuffle, no autosave yet.

import { z } from 'zod'
import { redirect } from 'next/navigation'
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

    // Make sure this teacher actually owns the course before adding a quiz to it.
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
    questionType: z.enum(['multiple_choice_single', 'true_false']),
    // Comma separated option text, only used for multiple choice.
    options: z.string().optional(),
    correctAnswer: z.string().min(1, 'Choose the correct answer'),
})

export type AddQuestionResult =
    | { ok: true }
    | { ok: false; error: string }

// Adds one question, plus its answer options, to a quiz. For true or
// false, the two options are created automatically.
export async function addQuestion(formData: FormData): Promise<AddQuestionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = addQuestionSchema.safeParse({
        quizId: formData.get('quizId'),
        questionText: formData.get('questionText'),
        questionType: formData.get('questionType'),
        options: formData.get('options'),
        correctAnswer: formData.get('correctAnswer'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { quizId, questionText, questionType, options, correctAnswer } = parsed.data

    // Confirm this teacher owns the course that this quiz belongs to.
    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, course_id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
            quiz_id: quizId,
            question_text: questionText,
            question_type: questionType,
            points: 1,
        })
        .select('id')
        .single()

    if (questionError || !question) {
        return { ok: false, error: 'Could not save the question.' }
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

        optionRows = optionTexts.map((text, index) => ({
            question_id: question.id,
            option_text: text,
            is_correct: text === correctAnswer,
            order_index: index,
        }))
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
        .select('id, title, course_id, passing_score, is_published, courses!inner(teacher_id, title)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return null
    }

    const { data: questions } = await supabase
        .from('questions')
        .select('id, question_text, question_type, order_index, answer_options(id, option_text, is_correct, order_index)')
        .eq('quiz_id', quizId)
        .order('order_index')

    // Options come back unordered from the nested select — sort them so
    // True/False and MCQ options always render in the order they were added.
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