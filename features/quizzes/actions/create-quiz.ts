'use server'
// Lets a teacher create a quiz inside a course, then add questions to
// it. Supports multiple choice (single), true/false, checklist
// (multiple correct options), and short answer (manual grading).

import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const createQuizSchema = z.object({
    courseId: z.string().uuid(),
    title: z.string().min(2, 'Title is too short'),
})

export type CreateQuizResult =
    | { ok: true; quizId: string }
    | { ok: false; error: string }

// Skips the separate "title first" page entirely — a teacher clicking
// Create > Quiz gets a draft quiz immediately (title "Untitled quiz")
// and is sent straight to the edit page, where the title is just
// another editable field (same pattern as lesson/assignment edit
// pages), rather than a one-time-only creation step.
export async function createDraftQuiz(courseId: string): Promise<CreateQuizResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsedCourseId = z.string().uuid().safeParse(courseId)
    if (!parsedCourseId.success) {
        return { ok: false, error: 'Invalid course.' }
    }

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
            title: 'Untitled quiz',
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

const updateQuizTitleSchema = z.object({
    quizId: z.string().uuid(),
    title: z.string().min(2, 'Title is too short'),
})

export type UpdateQuizTitleResult = { ok: true } | { ok: false; error: string }

// Lets a teacher rename a quiz from the edit page — the title field
// there is no longer a one-time creation input, it's editable for the
// life of the quiz, same as a lesson/assignment title.
export async function updateQuizTitle(formData: FormData): Promise<UpdateQuizTitleResult> {
    const user = await requireRole(['teacher'])

    const parsed = updateQuizTitleSchema.safeParse({
        quizId: formData.get('quizId'),
        title: formData.get('title'),
    })
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the title.' }
    }

    const { quizId, title } = parsed.data
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    const { error } = await supabase.from('quizzes').update({ title }).eq('id', quizId)

    if (error) {
        return { ok: false, error: 'Could not save the title. Please try again.' }
    }

    return { ok: true }
}

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

    // FIX: every question used to insert with the schema default
    // order_index = 0, since this insert never set it explicitly. With
    // multiple questions all sitting at order_index 0, ORDER BY
    // order_index in getQuizForTeacher has no defined tie-breaking
    // order, so a newly added question could sort anywhere, not
    // reliably at the bottom. Counting existing questions first and
    // assigning the next index makes ordering deterministic: each new
    // question always appends after the current last one.
    const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', quizId)

    const nextOrderIndex = count ?? 0

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
            order_index: nextOrderIndex,
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

const updateQuestionSchema = z.object({
    questionId: z.string().uuid(),
    questionText: z.string().min(2, 'Question is too short'),
    questionType: z.enum(['multiple_choice_single', 'true_false', 'checklist', 'short_answer']),
    options: z.string().optional(),
    correctAnswer: z.string().min(1, 'Enter the correct answer'),
})

export type UpdateQuestionResult =
    | { ok: true }
    | { ok: false; error: string }

// Edits an existing question in place. Answer options are replaced
// wholesale (delete then re-insert) rather than diffed individually —
// simplest way to keep order_index and is_correct consistent with
// whatever the teacher just edited, and mirrors addQuestion's own
// option-building logic exactly so both stay in sync going forward.
export async function updateQuestion(formData: FormData): Promise<UpdateQuestionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = updateQuestionSchema.safeParse({
        questionId: formData.get('questionId'),
        questionText: formData.get('questionText'),
        questionType: formData.get('questionType'),
        options: formData.get('options') ?? undefined,
        correctAnswer: formData.get('correctAnswer'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { questionId, questionText, questionType, options, correctAnswer } = parsed.data

    const { data: question } = await supabase
        .from('questions')
        .select('id, quizzes!inner(courses!inner(teacher_id))')
        .eq('id', questionId)
        .single()

    if (!question || (question as any).quizzes.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this question.' }
    }

    const { error: updateError } = await supabase
        .from('questions')
        .update({
            question_text: questionText,
            question_type: questionType,
            explanation: questionType === 'short_answer' ? correctAnswer : null,
        })
        .eq('id', questionId)

    if (updateError) {
        return { ok: false, error: 'Could not save the question.' }
    }

    // Wipe existing options, then rebuild from scratch below.
    const { error: deleteOptionsError } = await supabase
        .from('answer_options')
        .delete()
        .eq('question_id', questionId)

    if (deleteOptionsError) {
        return { ok: false, error: 'Could not update the answer options.' }
    }

    if (questionType === 'short_answer') {
        return { ok: true }
    }

    let optionRows: { question_id: string; option_text: string; is_correct: boolean; order_index: number }[] = []

    if (questionType === 'true_false') {
        optionRows = [
            { question_id: questionId, option_text: 'True', is_correct: correctAnswer === 'True', order_index: 0 },
            { question_id: questionId, option_text: 'False', is_correct: correctAnswer === 'False', order_index: 1 },
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
            const correctSet = new Set(
                correctAnswer
                    .split(',')
                    .map((text) => text.trim())
                    .filter(Boolean)
            )

            optionRows = optionTexts.map((text, index) => ({
                question_id: questionId,
                option_text: text,
                is_correct: correctSet.has(text),
                order_index: index,
            }))
        } else {
            optionRows = optionTexts.map((text, index) => ({
                question_id: questionId,
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

export type DeleteQuestionResult =
    | { ok: true }
    | { ok: false; error: string }

// Deletes a question and its answer options (FK cascade handles the
// options themselves). Ownership is checked the same way as
// updateQuestion — through the question's quiz, through the quiz's
// course, to the course's teacher_id.
export async function deleteQuestion(questionId: string): Promise<DeleteQuestionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsedId = z.string().uuid().safeParse(questionId)
    if (!parsedId.success) {
        return { ok: false, error: 'Invalid question.' }
    }

    const { data: question } = await supabase
        .from('questions')
        .select('id, quizzes!inner(courses!inner(teacher_id))')
        .eq('id', questionId)
        .single()

    if (!question || (question as any).quizzes.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this question.' }
    }

    const { error } = await supabase.from('questions').delete().eq('id', questionId)

    if (error) {
        return { ok: false, error: 'Could not delete the question. Please try again.' }
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
        .select('id, title, course_id, passing_score, is_published, time_limit_minutes, available_until, allow_late, show_results_after, grading_component, courses!inner(teacher_id, title)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return null
    }

    // FIX: answer_options has SELECT fully revoked from the `authenticated`
    // role (migration 019) — RLS policies on that table never get evaluated
    // without the base grant, so this embedded join returned an error (never
    // checked below) that was silently swallowed by `(questions ?? [])`,
    // making every quiz look like it had zero questions even when the
    // `questions` rows themselves existed. Ownership was already verified
    // above via is_course_teacher-equivalent check (courses.teacher_id ===
    // user.id), so it's safe to read through the admin client here, same
    // pattern as grade-short-answer.ts's computeAttemptTotal.
    const supabaseAdmin = createAdminClient()
    const { data: questions, error: questionsError } = await supabaseAdmin
        .from('questions')
        .select('id, question_text, question_type, order_index, explanation, answer_options(id, option_text, is_correct, order_index)')
        .eq('quiz_id', quizId)
        .order('order_index')

    if (questionsError) {
        console.error('getQuizForTeacher: failed to load questions', questionsError)
    }

    const questionsWithSortedOptions = (questions ?? []).map((q: any) => ({
        ...q,
        answer_options: [...(q.answer_options ?? [])].sort((a, b) => a.order_index - b.order_index),
    }))

    return { quiz, questions: questionsWithSortedOptions }
}

export type SetQuizFieldResult = { ok: true } | { ok: false; error: string }

// Lets a teacher set the passing score, once they know how many
// questions the quiz actually has.
export async function setPassingScore(quizId: string, passingScore: number): Promise<SetQuizFieldResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    const { data: updated, error } = await supabase
        .from('quizzes')
        .update({ passing_score: passingScore })
        .eq('id', quizId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save the passing score: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not save the passing score — the update did not apply.' }
    }

    return { ok: true }
}

export type GradingComponent = 'written_work' | 'performance_task' | 'quarterly_assessment'

// Lets a teacher set which DepEd Matatag component this quiz counts
// toward (Written Work / Performance Task / Quarterly Assessment —
// migration 057). Same ownership-check shape as setPassingScore,
// setTimeLimit, setResultsVisibility. Defaults to 'quarterly_assessment'
// at the column level (quizzes are usually the graded test at the end
// of a unit), but that default is only a fallback for pre-057 rows —
// this setter is how a teacher actually confirms/changes it, same as
// grading_component was made a required field at creation for
// assignments rather than left to the schema default.
export async function setGradingComponent(quizId: string, gradingComponent: GradingComponent): Promise<SetQuizFieldResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    const { data: updated, error } = await supabase
        .from('quizzes')
        .update({ grading_component: gradingComponent })
        .eq('id', quizId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save the grading component: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not save the grading component — the update did not apply.' }
    }

    return { ok: true }
}

// Lets a teacher turn the timer on/off, or change the minutes, after
// the quiz already exists. null means no timer.
export async function setTimeLimit(quizId: string, timeLimitMinutes: number | null): Promise<SetQuizFieldResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    const { data: updated, error } = await supabase
        .from('quizzes')
        .update({ time_limit_minutes: timeLimitMinutes })
        .eq('id', quizId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save the time limit: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not save the time limit — the update did not apply.' }
    }

    return { ok: true }
}

export type ResultsVisibility = 'immediately' | 'after_grading' | 'never'

// Lets a teacher control whether students see per-question correctness
// after submitting. See migration 033 for what each value means. This
// only changes what grade-quiz-submission.ts includes in its response
// going forward — it doesn't rewrite anything for attempts already
// submitted.
export async function setResultsVisibility(quizId: string, visibility: ResultsVisibility): Promise<SetQuizFieldResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    const { data: updated, error } = await supabase
        .from('quizzes')
        .update({ show_results_after: visibility })
        .eq('id', quizId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save results visibility: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not save results visibility — the update did not apply.' }
    }

    return { ok: true }
}

export type SetQuizDeadlineResult = { ok: true } | { ok: false; error: string }

// Lets a teacher set (or clear) the quiz's deadline and whether late
// starts/submissions are allowed past it. `availableUntil` must already
// be a real UTC ISO string (or null) — conversion from the teacher's
// local time happens client-side, in QuizDeadlineSetting.tsx, the same
// pattern established for assignments (see NewAssignmentForm.tsx /
// EditAssignmentForm.tsx's 2026-08-03 fixes). Once saved, the actual
// enforcement lives in two other places, not here: the
// prevent_response_after_expiry trigger (migration 060) cuts off
// in-progress attempts, and startQuizAttempt/gradeQuizSubmission both
// re-check before letting a new attempt start or a submission finalize.
//
// NOTE (2026-08-03): the silent-failure risk flagged here for
// setPassingScore, setTimeLimit, setResultsVisibility,
// setGradingComponent, and toggleQuizPublish — a plain `.update()`
// with no `.select()` and no error check, so an RLS WITH CHECK
// rejection looked identical to success — is now fixed for all five,
// same session, following setQuizDeadline's own already-correct
// pattern below. Same root cause class as toggle_assignment_publish
// (migration 053) and, most recently, the users_self_update RLS
// recursion bug (migration 058) — three different tables, same
// underlying lesson: a Supabase update() reporting no error is not
// the same thing as a row actually changing.
export async function setQuizDeadline(
    quizId: string,
    availableUntil: string | null,
    allowLate: boolean
): Promise<SetQuizDeadlineResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    const { data: updated, error } = await supabase
        .from('quizzes')
        .update({ available_until: availableUntil, allow_late: allowLate })
        .eq('id', quizId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save the deadline: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return {
            ok: false,
            error: 'Could not save the deadline — the update did not apply. Please try again.',
        }
    }

    return { ok: true }
}

// Lets a teacher publish or unpublish a quiz.
export async function toggleQuizPublish(quizId: string, publish: boolean): Promise<SetQuizFieldResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    const { data: updated, error } = await supabase
        .from('quizzes')
        .update({ is_published: publish })
        .eq('id', quizId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not update this quiz: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not update this quiz — the update did not apply.' }
    }

    return { ok: true }
}
