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

// 2026-08-19 — NO LONGER CALLED. Was inserting a real, empty quizzes
// row (title: '', zero questions) the instant "Create > Quiz" was
// clicked, before the teacher had entered anything. That empty row
// was a genuine draft as far as the database and
// getTeacherCourseStream were concerned, so it showed up in the
// course stream immediately — an unwanted "draft with nothing in it"
// appearing the moment the button was clicked, not when the teacher
// actually had content. Replaced by createQuizWithFirstQuestion below
// plus the new /teacher/courses/[courseId]/quizzes/new page — nothing
// is written to the quizzes table anymore until a title AND at least
// one real question exist together, inserted in the same action. Left
// in place (not deleted) since removing an exported function from a
// shared actions file risks breaking a caller elsewhere that wasn't
// checked as part of this change.
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
            title: '',
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

    const { data: updated, error } = await supabase
        .from('quizzes')
        .update({ title })
        .eq('id', quizId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save the title: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not save the title — the update did not apply.' }
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
    | { ok: true; quizPublished: boolean }
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
        .select('id, course_id, is_published, courses!inner(teacher_id)')
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
        return { ok: true, quizPublished: (quiz as any).is_published }
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

    return { ok: true, quizPublished: (quiz as any).is_published }
}

const createQuizWithFirstQuestionSchema = z.object({
    courseId: z.string().uuid(),
    title: z.string().min(2, 'Give this quiz a name (at least 2 characters).'),
    questionText: z.string().min(2, 'Question is too short'),
    questionType: z.enum(['multiple_choice_single', 'true_false', 'checklist', 'short_answer']),
    options: z.string().optional(),
    correctAnswer: z.string().min(1, 'Enter the correct answer'),
    // Settings — same fields as saveQuizSettingsAndPublish, collected
    // up front now instead of only being editable after creation (see
    // NewQuizForm.tsx: "no separate button for it, settings apply when
    // they click create quiz").
    timeLimitMinutes: z.string().optional(),
    maxAttempts: z.string().optional(),
    resultsVisibility: z.enum(['submission', 'grading', 'never']).optional(),
    availableUntil: z.string().optional(),
    allowLate: z.string().optional(),
    publish: z.string().optional(),
})

export type CreateQuizWithFirstQuestionResult =
    | { ok: true; quizId: string }
    | { ok: false; error: string }

// Replaces the old createDraftQuiz + addQuestion two-step flow for
// initial quiz creation. A quiz row is only ever written once a title
// AND a real first question exist together — this is the one place
// that inserts the very first quizzes row, and it always does so with
// its first question in the same action, so there is never a moment a
// titled-but-empty (or empty-and-untitled) quiz exists in the
// database and could show up in getTeacherCourseStream.
//
// If the question/options insert fails after the quiz row was
// created, the just-created quiz row is deleted before returning an
// error — a failure here must never leave an orphaned empty quiz
// behind, which was exactly the bug this replaces.
export async function createQuizWithFirstQuestion(
    formData: FormData
): Promise<CreateQuizWithFirstQuestionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = createQuizWithFirstQuestionSchema.safeParse({
        courseId: formData.get('courseId'),
        title: formData.get('title'),
        questionText: formData.get('questionText'),
        questionType: formData.get('questionType'),
        options: formData.get('options') ?? undefined,
        correctAnswer: formData.get('correctAnswer'),
        timeLimitMinutes: formData.get('timeLimitMinutes') ?? undefined,
        maxAttempts: formData.get('maxAttempts') ?? undefined,
        resultsVisibility: formData.get('resultsVisibility') ?? undefined,
        availableUntil: formData.get('availableUntil') ?? undefined,
        allowLate: formData.get('allowLate') ?? undefined,
        publish: formData.get('publish') ?? undefined,
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { courseId, title, questionText, questionType, options, correctAnswer } = parsed.data

    const timeLimitMinutes =
        parsed.data.timeLimitMinutes && parsed.data.timeLimitMinutes.trim() !== ''
            ? Number(parsed.data.timeLimitMinutes)
            : null
    if (timeLimitMinutes !== null && (!Number.isFinite(timeLimitMinutes) || timeLimitMinutes < 1)) {
        return { ok: false, error: 'Time limit must be at least 1 minute, or left blank for no limit.' }
    }

    const maxAttempts = parsed.data.maxAttempts ? Number(parsed.data.maxAttempts) : 1
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
        return { ok: false, error: 'Max attempts must be at least 1.' }
    }

    const resultsVisibility = parsed.data.resultsVisibility ?? 'submission'
    const availableUntil =
        parsed.data.availableUntil && parsed.data.availableUntil.trim() !== '' ? parsed.data.availableUntil : null
    const allowLate = parsed.data.allowLate === 'true'
    const publish = parsed.data.publish === 'true'

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false, error: 'You do not have access to this course.' }
    }

    // Validate the question content BEFORE creating anything — same
    // checks addQuestion applies, done here first so a bad question
    // never even gets as far as inserting a quiz row.
    if (questionType !== 'short_answer' && questionType !== 'true_false') {
        const optionTexts = (options ?? '')
            .split(',')
            .map((text) => text.trim())
            .filter(Boolean)
        if (optionTexts.length < 2) {
            return { ok: false, error: 'Add at least two answer options.' }
        }
    }

    const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
            course_id: courseId,
            created_by: user.id,
            title,
            time_limit_minutes: timeLimitMinutes,
            max_attempts: maxAttempts,
            show_results_after: resultsVisibility,
            available_until: availableUntil,
            allow_late: allowLate,
            is_published: publish,
        })
        .select('id')
        .single()

    if (quizError || !quiz) {
        return { ok: false, error: 'Could not create the quiz. Please try again.' }
    }

    const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
            quiz_id: quiz.id,
            question_text: questionText,
            question_type: questionType,
            points: 1,
            order_index: 0,
            explanation: questionType === 'short_answer' ? correctAnswer : null,
        })
        .select('id')
        .single()

    if (questionError || !question) {
        // Roll back the quiz row — don't leave an empty quiz behind
        // just because the question failed to save.
        await supabase.from('quizzes').delete().eq('id', quiz.id)
        return { ok: false, error: 'Could not save the question. Please try again.' }
    }

    // Short answer has no answer options — same as addQuestion.
    if (questionType === 'short_answer') {
        return { ok: true, quizId: quiz.id }
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

        if (questionType === 'checklist') {
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
        // Same rollback principle — a half-saved question with no
        // options is just as much an "empty" quiz in practice as one
        // with zero questions, so roll the whole thing back.
        await supabase.from('quizzes').delete().eq('id', quiz.id)
        return { ok: false, error: 'Could not save the answer options. Please try again.' }
    }

    return { ok: true, quizId: quiz.id }
}

const quizQuestionDraftSchema = z.object({
    questionText: z.string().min(2, 'Question is too short'),
    questionType: z.enum(['multiple_choice_single', 'true_false', 'checklist', 'short_answer']),
    options: z.string().optional(),
    correctAnswer: z.string().min(1, 'Enter the correct answer'),
})

const createQuizWithQuestionsSchema = z.object({
    courseId: z.string().uuid(),
    title: z.string().min(2, 'Give this quiz a name (at least 2 characters).'),
    // JSON-encoded array of quizQuestionDraftSchema, built client-side
    // by NewQuizForm.tsx — one entry per question card the teacher
    // stacked up before submitting. Encoded as a single JSON string
    // (rather than repeated formData keys) since the number of
    // questions, and the number of options within each, is dynamic.
    questions: z.string(),
    timeLimitMinutes: z.string().optional(),
    maxAttempts: z.string().optional(),
    resultsVisibility: z.enum(['submission', 'grading', 'never']).optional(),
    availableUntil: z.string().optional(),
    allowLate: z.string().optional(),
    publish: z.string().optional(),
})

export type CreateQuizWithQuestionsResult =
    | { ok: true; quizId: string }
    | { ok: false; error: string }

// Sibling to createQuizWithFirstQuestion, not a replacement for it —
// that function is left exactly as-is (same "don't remove exported
// functions from a shared actions file" reasoning as createDraftQuiz
// above). This one exists because NewQuizForm.tsx was redesigned to
// let a teacher stack up multiple question cards — same as
// AddQuestionForm/QuestionCard already let them do on the edit page —
// before the quiz is ever created, instead of being limited to
// exactly one question up front.
//
// Same "never leave an orphaned empty/partial quiz behind" guarantee
// as createQuizWithFirstQuestion: the quiz row is only inserted after
// every question draft has been validated, and if any single
// question's insert (or its options) fails partway through, the whole
// quiz row is deleted before returning an error — never a quiz left
// behind with only some of its questions saved.
export async function createQuizWithQuestions(
    formData: FormData
): Promise<CreateQuizWithQuestionsResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = createQuizWithQuestionsSchema.safeParse({
        courseId: formData.get('courseId'),
        title: formData.get('title'),
        questions: formData.get('questions'),
        timeLimitMinutes: formData.get('timeLimitMinutes') ?? undefined,
        maxAttempts: formData.get('maxAttempts') ?? undefined,
        resultsVisibility: formData.get('resultsVisibility') ?? undefined,
        availableUntil: formData.get('availableUntil') ?? undefined,
        allowLate: formData.get('allowLate') ?? undefined,
        publish: formData.get('publish') ?? undefined,
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { courseId, title } = parsed.data

    let questionDrafts: z.infer<typeof quizQuestionDraftSchema>[]
    try {
        const rawQuestions = JSON.parse(parsed.data.questions)
        const parsedQuestions = z.array(quizQuestionDraftSchema).min(1, 'Add at least one question.').safeParse(rawQuestions)
        if (!parsedQuestions.success) {
            return { ok: false, error: parsedQuestions.error.issues[0]?.message ?? 'Please check your questions.' }
        }
        questionDrafts = parsedQuestions.data
    } catch {
        return { ok: false, error: 'Could not read the questions. Please try again.' }
    }

    const timeLimitMinutes =
        parsed.data.timeLimitMinutes && parsed.data.timeLimitMinutes.trim() !== ''
            ? Number(parsed.data.timeLimitMinutes)
            : null
    if (timeLimitMinutes !== null && (!Number.isFinite(timeLimitMinutes) || timeLimitMinutes < 1)) {
        return { ok: false, error: 'Time limit must be at least 1 minute, or left blank for no limit.' }
    }

    const maxAttempts = parsed.data.maxAttempts ? Number(parsed.data.maxAttempts) : 1
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
        return { ok: false, error: 'Max attempts must be at least 1.' }
    }

    const resultsVisibility = parsed.data.resultsVisibility ?? 'submission'
    const availableUntil =
        parsed.data.availableUntil && parsed.data.availableUntil.trim() !== '' ? parsed.data.availableUntil : null
    const allowLate = parsed.data.allowLate === 'true'
    const publish = parsed.data.publish === 'true'

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false, error: 'You do not have access to this course.' }
    }

    // Validate every question's content BEFORE creating anything —
    // same checks addQuestion/createQuizWithFirstQuestion apply, done
    // here first so a bad question never even gets as far as
    // inserting a quiz row. Errors reference the question's position
    // (1-based) so the teacher can find the offending card.
    for (const [i, draft] of questionDrafts.entries()) {
        if (draft.questionType !== 'short_answer' && draft.questionType !== 'true_false') {
            const optionTexts = (draft.options ?? '')
                .split(',')
                .map((text) => text.trim())
                .filter(Boolean)
            if (optionTexts.length < 2) {
                return { ok: false, error: `Question ${i + 1}: add at least two answer options.` }
            }
        }
    }

    const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
            course_id: courseId,
            created_by: user.id,
            title,
            time_limit_minutes: timeLimitMinutes,
            max_attempts: maxAttempts,
            show_results_after: resultsVisibility,
            available_until: availableUntil,
            allow_late: allowLate,
            is_published: publish,
        })
        .select('id')
        .single()

    if (quizError || !quiz) {
        return { ok: false, error: 'Could not create the quiz. Please try again.' }
    }

    // Insert every question in order, exactly the same shape as
    // createQuizWithFirstQuestion/addQuestion build for a single
    // question — just looped, with order_index following each
    // question's position in the array.
    for (const [i, { questionText, questionType, options, correctAnswer }] of questionDrafts.entries()) {

        const { data: question, error: questionError } = await supabase
            .from('questions')
            .insert({
                quiz_id: quiz.id,
                question_text: questionText,
                question_type: questionType,
                points: 1,
                order_index: i,
                explanation: questionType === 'short_answer' ? correctAnswer : null,
            })
            .select('id')
            .single()

        if (questionError || !question) {
            await supabase.from('quizzes').delete().eq('id', quiz.id)
            return { ok: false, error: `Could not save question ${i + 1}. Please try again.` }
        }

        if (questionType === 'short_answer') continue

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

            if (questionType === 'checklist') {
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
            await supabase.from('quizzes').delete().eq('id', quiz.id)
            return { ok: false, error: `Could not save the answer options for question ${i + 1}. Please try again.` }
        }
    }

    return { ok: true, quizId: quiz.id }
}

const updateQuestionSchema = z.object({
    questionId: z.string().uuid(),
    questionText: z.string().min(2, 'Question is too short'),
    questionType: z.enum(['multiple_choice_single', 'true_false', 'checklist', 'short_answer']),
    options: z.string().optional(),
    correctAnswer: z.string().min(1, 'Enter the correct answer'),
})

export type UpdateQuestionResult =
    | { ok: true; quizPublished: boolean }
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
        .select('id, quizzes!inner(is_published, courses!inner(teacher_id))')
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
        return { ok: true, quizPublished: (question as any).quizzes.is_published }
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

    return { ok: true, quizPublished: (question as any).quizzes.is_published }
}

export type DeleteQuestionResult =
    | { ok: true; quizPublished: boolean }
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
        .select('id, quizzes!inner(is_published, courses!inner(teacher_id))')
        .eq('id', questionId)
        .single()

    if (!question || (question as any).quizzes.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this question.' }
    }

    const { error } = await supabase.from('questions').delete().eq('id', questionId)

    if (error) {
        return { ok: false, error: 'Could not delete the question. Please try again.' }
    }

    return { ok: true, quizPublished: (question as any).quizzes.is_published }
}

export type ResetQuizAttemptsResult =
    | { ok: true; attemptsCleared: number }
    | { ok: false; error: string }

// Wipes every existing attempt (and response) for a quiz via the
// migration-062 RPC, so students who already took it can take the
// corrected version. Called from the edit page after a question
// add/edit/delete on a quiz that was already published — see
// AddQuestionForm.tsx / QuestionCard.tsx, which prompt the teacher
// with a confirm dialog before calling this. Not gated on
// is_published here — a teacher might reasonably want to clear stray
// attempts on a quiz that's since been unpublished too, and baking
// that check into this function would just be a second place for "is
// this quiz live" to drift from the actual column.
export async function resetQuizAttempts(quizId: string): Promise<ResetQuizAttemptsResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsedId = z.string().uuid().safeParse(quizId)
    if (!parsedId.success) {
        return { ok: false, error: 'Invalid quiz.' }
    }

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    const { data, error } = await supabase.rpc('reset_quiz_attempts', { p_quiz_id: quizId })

    if (error) {
        return { ok: false, error: `Could not reset attempts: ${error.message}` }
    }

    return { ok: true, attemptsCleared: (data as number) ?? 0 }
}

// Loads a quiz and its questions, including each question's answer
// options, for the teacher to review while building it.
export async function getQuizForTeacher(quizId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, title, course_id, is_published, time_limit_minutes, max_attempts, available_until, allow_late, show_results_after, courses!inner(teacher_id, title)')
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

// Sets how many times a student may attempt this quiz. Defaults to 1
// at creation (createDraftQuiz/createQuiz) — this lets the teacher
// raise or lower it afterward from the quiz settings UI. Lowering it
// below a student's current attempt_number does NOT retroactively
// block anything already in progress; it only affects whether a new
// attempt can be started going forward, same as every other quiz
// setting change.
export async function setMaxAttempts(quizId: string, maxAttempts: number): Promise<SetQuizFieldResult> {
    const user = await requireRole(['teacher'])

    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
        return { ok: false, error: 'Max attempts must be at least 1.' }
    }

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
        .update({ max_attempts: maxAttempts })
        .eq('id', quizId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save max attempts: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not save max attempts — the update did not apply.' }
    }

    return { ok: true }
}

export type ResultsVisibility = 'submission' | 'grading' | 'never'

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
// setTimeLimit and setResultsVisibility — a plain `.update()`
// with no `.select()` and no error check, so an RLS WITH CHECK
// rejection looked identical to success — is now fixed for all
// remaining setters, same session, following setQuizDeadline's own
// already-correct pattern below. (setPassingScore and
// setGradingComponent, also fixed at the time, no longer exist —
// removed along with passing_score/grading_component entirely, see
// migrations 071 and 077.) Same root cause class as
// toggle_assignment_publish (migration 053) and, most recently, the
// users_self_update RLS recursion bug (migration 058) — three
// different tables, same
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

export type SaveQuizSettingsResult = { ok: true } | { ok: false; error: string }

// Combines setTimeLimit + setMaxAttempts + setResultsVisibility +
// setQuizDeadline + toggleQuizPublish into one call and one database
// update. Added 2026-08-19 per explicit feedback: having a separate
// "Save changes" step for settings and a separate "Post" button below
// it was confusing — teachers want one button that applies whatever
// is currently in the settings form AND posts/publishes the quiz at
// the same time. This replaces that two-step, five-separate-setter
// flow with a single update() call touching every field at once.
//
// The individual setters (setTimeLimit, setMaxAttempts, etc.) are left
// in place, not deleted — same reasoning as createDraftQuiz above,
// removing exported functions from a shared actions file risks
// breaking a caller elsewhere that wasn't checked as part of this
// change.
export async function saveQuizSettingsAndPublish(formData: FormData): Promise<SaveQuizSettingsResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const quizId = formData.get('quizId')
    if (typeof quizId !== 'string' || !quizId) {
        return { ok: false, error: 'No quiz was specified.' }
    }

    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, is_published, courses!inner(teacher_id)')
        .eq('id', quizId)
        .single()

    if (!quiz || (quiz as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this quiz.' }
    }

    const timeLimitRaw = formData.get('timeLimitMinutes')
    const timeLimitMinutes =
        typeof timeLimitRaw === 'string' && timeLimitRaw.trim() !== '' ? Number(timeLimitRaw) : null
    if (timeLimitMinutes !== null && (!Number.isFinite(timeLimitMinutes) || timeLimitMinutes < 1)) {
        return { ok: false, error: 'Time limit must be at least 1 minute, or left blank for no limit.' }
    }

    const maxAttemptsRaw = formData.get('maxAttempts')
    const maxAttempts = typeof maxAttemptsRaw === 'string' ? Number(maxAttemptsRaw) : NaN
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
        return { ok: false, error: 'Max attempts must be at least 1.' }
    }

    const visibilityRaw = formData.get('resultsVisibility')
    const visibility: ResultsVisibility =
        visibilityRaw === 'grading' || visibilityRaw === 'never' ? visibilityRaw : 'submission'

    const availableUntilRaw = formData.get('availableUntil')
    const availableUntil =
        typeof availableUntilRaw === 'string' && availableUntilRaw.trim() !== '' ? availableUntilRaw : null
    const allowLate = formData.get('allowLate') === 'true'

    // 2026-08-19 — publishing is now one-way from this action, per
    // explicit requirement (no more separate Unpost button, and no
    // way to send a posted quiz back to draft from this page at all).
    // The UI only ever sends publish=true, but that's not enforced
    // just by trusting the client — once a quiz is already published,
    // this line makes it structurally impossible for this action to
    // flip it back to false, no matter what the request contains.
    // toggleQuizPublish (unchanged, still exported) is the only
    // remaining way to unpublish a quiz, and nothing calls it anymore.
    const requestedPublish = formData.get('publish') === 'true'
    const publish = (quiz as any).is_published ? true : requestedPublish

    const { data: updated, error } = await supabase
        .from('quizzes')
        .update({
            time_limit_minutes: timeLimitMinutes,
            max_attempts: maxAttempts,
            show_results_after: visibility,
            available_until: availableUntil,
            allow_late: allowLate,
            is_published: publish,
        })
        .eq('id', quizId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save this quiz: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not save this quiz — the update did not apply.' }
    }

    return { ok: true }
}
