'use server'
// Activity-level actions for the mission builder.
//
// SCOPE CHANGE (migration 094, 2026-08-31): an "activity" is no longer
// a single prompt+options pair — it's now a CONTAINER holding multiple
// activity_questions, each with its own activity_question_options.
// Duolingo/Quizizz-style: one activity plays like a mini-quiz-within-
// a-mission. This file's addActivity/updateActivity previously wrote
// directly to `activities`+`activity_options`; they now write
// `activities` (container row only: mission_id, order_index,
// remediates_activity_id — prompt/hint/points/activity_type moved down
// to the question level) plus N rows each in `activity_questions` +
// `activity_question_options`.
//
// Only multiple_choice_single and true_false are supported per
// question, same restriction as before, just moved down a level.

import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const questionTypeSchema = z.enum(['multiple_choice_single', 'true_false'])

const questionInputSchema = z.object({
    prompt: z.string().min(2, 'Question prompt is too short'),
    questionType: questionTypeSchema,
    options: z.string().optional(),
    correctAnswer: z.string().min(1, 'Enter the correct answer'),
    hintText: z.string().optional(),
})

// The client sends one JSON-encoded array of questions under the
// `questions` field, rather than repeated indexed form fields — much
// simpler to validate as one array with Zod than to reconstruct
// questions[0].prompt/questions[1].prompt-style repeated keys from a
// raw FormData.
const questionsArraySchema = z.array(questionInputSchema).min(1, 'Add at least one question.')

const addActivitySchema = z.object({
    missionId: z.string().uuid(),
    // Optional: marks this new activity as the fallback shown when a
    // student is still wrong after the hint on an EXISTING activity.
    remediatesActivityId: z.string().uuid().optional(),
})

export type AddActivityResult = { ok: true; missionPublished: boolean } | { ok: false; error: string }

function buildOptionRows(
    questionId: string,
    questionType: 'multiple_choice_single' | 'true_false',
    options: string | undefined,
    correctAnswer: string
): { question_id: string; option_text: string; is_correct: boolean; order_index: number }[] | { error: string } {
    if (questionType === 'true_false') {
        return [
            { question_id: questionId, option_text: 'True', is_correct: correctAnswer === 'True', order_index: 0 },
            { question_id: questionId, option_text: 'False', is_correct: correctAnswer === 'False', order_index: 1 },
        ]
    }

    const optionTexts = (options ?? '')
        .split(',')
        .map((text) => text.trim())
        .filter(Boolean)

    if (optionTexts.length < 2) {
        return { error: 'Each multiple choice question needs at least two answer options.' }
    }

    return optionTexts.map((text, index) => ({
        question_id: questionId,
        option_text: text,
        is_correct: text === correctAnswer,
        order_index: index,
    }))
}

// Adds one activity (a container) plus its questions and their answer
// options to an existing mission.
export async function addActivity(formData: FormData): Promise<AddActivityResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsedActivity = addActivitySchema.safeParse({
        missionId: formData.get('missionId'),
        remediatesActivityId: formData.get('remediatesActivityId') || undefined,
    })

    if (!parsedActivity.success) {
        return { ok: false, error: parsedActivity.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const rawQuestions = formData.get('questions')
    let questionsInput: unknown
    try {
        questionsInput = JSON.parse(typeof rawQuestions === 'string' ? rawQuestions : '[]')
    } catch {
        return { ok: false, error: 'Could not read the questions for this activity.' }
    }

    const parsedQuestions = questionsArraySchema.safeParse(questionsInput)
    if (!parsedQuestions.success) {
        return { ok: false, error: parsedQuestions.error.issues[0]?.message ?? 'Please check the questions.' }
    }

    const { missionId, remediatesActivityId } = parsedActivity.data
    const questions = parsedQuestions.data

    const { data: mission } = await supabase
        .from('missions')
        .select('id, is_published, lessons!inner(courses!inner(teacher_id))')
        .eq('id', missionId)
        .single()

    if (!mission || (mission as any).lessons.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this mission.' }
    }

    // Validate every question's options up front, before writing
    // anything — a mid-way failure would otherwise leave an activity
    // container with a partial question set.
    for (const q of questions) {
        const rows = buildOptionRows('placeholder', q.questionType, q.options, q.correctAnswer)
        if ('error' in rows) {
            return { ok: false, error: rows.error }
        }
    }

    const { count } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('mission_id', missionId)

    // questionsArraySchema.min(1) already guarantees at least one
    // element at RUNTIME, but TypeScript can't see through that Zod
    // constraint — questions[0] alone still types as possibly
    // undefined (index access is never narrowed just from an array
    // being non-empty). Destructuring here + an explicit guard gives
    // TypeScript a real narrowing point instead of reaching for a
    // non-null assertion, which would silently paper over the case if
    // this invariant were ever broken by a later refactor.
    const [firstQuestion] = questions
    if (!firstQuestion) {
        return { ok: false, error: 'Add at least one question.' }
    }

    const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert({
            mission_id: missionId,
            // prompt is still NOT NULL on `activities` per the existing
            // schema — the container itself has no real prompt anymore,
            // so this is set to the first question's prompt purely to
            // satisfy the column, not read anywhere in the new model.
            prompt: firstQuestion.prompt,
            activity_type: firstQuestion.questionType,
            points: questions.length,
            order_index: count ?? 0,
            remediates_activity_id: remediatesActivityId ?? null,
        })
        .select('id')
        .single()

    if (activityError || !activity) {
        return { ok: false, error: 'Could not save the activity.' }
    }

        for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q) continue
        const hintText = q.hintText && q.hintText.trim() !== '' ? q.hintText.trim() : null

        const { data: question, error: questionError } = await supabase
            .from('activity_questions')
            .insert({
                activity_id: activity.id,
                prompt: q.prompt,
                question_type: q.questionType,
                points: 1,
                hint_text: hintText,
                order_index: i,
            })
            .select('id')
            .single()

        if (questionError || !question) {
            return { ok: false, error: 'Could not save one of the questions.' }
        }

        const optionRows = buildOptionRows(question.id, q.questionType, q.options, q.correctAnswer)
        if ('error' in optionRows) {
            return { ok: false, error: optionRows.error }
        }

        const { error: optionsError } = await supabase.from('activity_question_options').insert(optionRows)
        if (optionsError) {
            return { ok: false, error: 'Could not save the answer options for one of the questions.' }
        }
    }

    return { ok: true, missionPublished: (mission as any).is_published }
}

const updateActivitySchema = z.object({
    activityId: z.string().uuid(),
    remediatesActivityId: z.string().optional(),
})

export type UpdateActivityResult = { ok: true; missionPublished: boolean } | { ok: false; error: string }

// Edits an existing activity's question set. Questions/options are
// replaced wholesale (delete then re-insert), same wipe-and-rebuild
// approach as before, just one level deeper.
export async function updateActivity(formData: FormData): Promise<UpdateActivityResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsedActivity = updateActivitySchema.safeParse({
        activityId: formData.get('activityId'),
        remediatesActivityId: formData.get('remediatesActivityId') ?? undefined,
    })

    if (!parsedActivity.success) {
        return { ok: false, error: parsedActivity.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const rawQuestions = formData.get('questions')
    let questionsInput: unknown
    try {
        questionsInput = JSON.parse(typeof rawQuestions === 'string' ? rawQuestions : '[]')
    } catch {
        return { ok: false, error: 'Could not read the questions for this activity.' }
    }

    const parsedQuestions = questionsArraySchema.safeParse(questionsInput)
    if (!parsedQuestions.success) {
        return { ok: false, error: parsedQuestions.error.issues[0]?.message ?? 'Please check the questions.' }
    }

    const { activityId } = parsedActivity.data
    const questions = parsedQuestions.data

    // Empty string ("None" in the picker) clears the remediation link;
    // anything else must be a real uuid pointing at a DIFFERENT
    // activity — re-checked server-side rather than trusted from the
    // client, same as before.
    const rawRemediatesId = parsedActivity.data.remediatesActivityId
    let remediatesActivityId: string | null = null
    if (rawRemediatesId && rawRemediatesId.trim() !== '') {
        const parsedRemediatesId = z.string().uuid().safeParse(rawRemediatesId)
        if (!parsedRemediatesId.success) {
            return { ok: false, error: 'Invalid remediation activity.' }
        }
        if (parsedRemediatesId.data === activityId) {
            return { ok: false, error: 'An activity cannot remediate itself.' }
        }
        remediatesActivityId = parsedRemediatesId.data
    }

    const { data: activity } = await supabase
        .from('activities')
        .select('id, missions!inner(is_published, lessons!inner(courses!inner(teacher_id)))')
        .eq('id', activityId)
        .single()

    if (!activity || (activity as any).missions.lessons.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this activity.' }
    }

    for (const q of questions) {
        const rows = buildOptionRows('placeholder', q.questionType, q.options, q.correctAnswer)
        if ('error' in rows) {
            return { ok: false, error: rows.error }
        }
    }

    // Same TypeScript-can't-see-Zod's-min(1) situation as addActivity
    // above — destructure + explicit guard instead of a non-null
    // assertion.
    const [firstQuestion] = questions
    if (!firstQuestion) {
        return { ok: false, error: 'Add at least one question.' }
    }

    const { error: updateError } = await supabase
        .from('activities')
        .update({
            prompt: firstQuestion.prompt,
            activity_type: firstQuestion.questionType,
            points: questions.length,
            remediates_activity_id: remediatesActivityId,
        })
        .eq('id', activityId)

    if (updateError) {
        return { ok: false, error: 'Could not save the activity.' }
    }

    // Wipe existing questions — FK cascade on activity_question_options
    // (via activity_questions_pkey -> activity_question_options_question_id_fkey)
    // is NOT declared with ON DELETE CASCADE in migration 094, so
    // options must be deleted explicitly first via their parent
    // question ids, same two-step order the mission_progress/
    // activity_mastery cleanup elsewhere in this codebase already uses
    // when no cascade exists.
    const { data: existingQuestions } = await supabase
        .from('activity_questions')
        .select('id')
        .eq('activity_id', activityId)

    const existingQuestionIds = (existingQuestions ?? []).map((q) => q.id)

    if (existingQuestionIds.length > 0) {
        const { error: deleteOptionsError } = await supabase
            .from('activity_question_options')
            .delete()
            .in('question_id', existingQuestionIds)

        if (deleteOptionsError) {
            return { ok: false, error: 'Could not update the answer options.' }
        }

        const { error: deleteQuestionsError } = await supabase
            .from('activity_questions')
            .delete()
            .eq('activity_id', activityId)

        if (deleteQuestionsError) {
            return { ok: false, error: 'Could not update the questions.' }
        }
    }

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q) continue
        const hintText = q.hintText && q.hintText.trim() !== '' ? q.hintText.trim() : null

        const { data: question, error: questionError } = await supabase
            .from('activity_questions')
            .insert({
                activity_id: activityId,
                prompt: q.prompt,
                question_type: q.questionType,
                points: 1,
                hint_text: hintText,
                order_index: i,
            })
            .select('id')
            .single()

        if (questionError || !question) {
            return { ok: false, error: 'Could not save one of the questions.' }
        }

        const optionRows = buildOptionRows(question.id, q.questionType, q.options, q.correctAnswer)
        if ('error' in optionRows) {
            return { ok: false, error: optionRows.error }
        }

        const { error: optionsError } = await supabase.from('activity_question_options').insert(optionRows)
        if (optionsError) {
            return { ok: false, error: 'Could not save the answer options for one of the questions.' }
        }
    }

    return { ok: true, missionPublished: (activity as any).missions.is_published }
}

export type DeleteActivityResult = { ok: true; missionPublished: boolean } | { ok: false; error: string }

// Deletes an activity and its questions/options. No DB cascade exists
// (see the note in updateActivity above), so this explicitly deletes
// activity_question_options -> activity_questions -> activities in
// that order, then the FK cascade that DOES exist on
// activities -> activity_options handles that older table
// automatically if any legacy rows are still attached to this
// activity_id.
export async function deleteActivity(activityId: string): Promise<DeleteActivityResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsedId = z.string().uuid().safeParse(activityId)
    if (!parsedId.success) {
        return { ok: false, error: 'Invalid activity.' }
    }

    const { data: activity } = await supabase
        .from('activities')
        .select('id, missions!inner(is_published, lessons!inner(courses!inner(teacher_id)))')
        .eq('id', activityId)
        .single()

    if (!activity || (activity as any).missions.lessons.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this activity.' }
    }

    const { data: existingQuestions } = await supabase
        .from('activity_questions')
        .select('id')
        .eq('activity_id', activityId)

    const existingQuestionIds = (existingQuestions ?? []).map((q) => q.id)

    if (existingQuestionIds.length > 0) {
        const { error: deleteOptionsError } = await supabase
            .from('activity_question_options')
            .delete()
            .in('question_id', existingQuestionIds)

        if (deleteOptionsError) {
            return { ok: false, error: 'Could not delete the activity. Please try again.' }
        }

        const { error: deleteQuestionsError } = await supabase
            .from('activity_questions')
            .delete()
            .eq('activity_id', activityId)

        if (deleteQuestionsError) {
            return { ok: false, error: 'Could not delete the activity. Please try again.' }
        }
    }

    const { error } = await supabase.from('activities').delete().eq('id', activityId)

    if (error) {
        return { ok: false, error: 'Could not delete the activity. Please try again.' }
    }

    return { ok: true, missionPublished: (activity as any).missions.is_published }
}
