'use server'
// Activity-level actions for the mission builder — mirrors the
// addQuestion / updateQuestion / deleteQuestion section of
// features/quizzes/actions/create-quiz.ts. Mission-level actions
// (create/settings/load) live in create-mission.ts instead — see that
// file's header for why this project splits the two, unlike quizzes'
// single combined file.
//
// Only multiple_choice_single and true_false are supported. See
// create-mission.ts's header for why short_answer is deliberately
// excluded (no reference-answer column on `activities` yet, and
// attempt_events.is_correct is NOT NULL so it can't defer to manual
// grading the way quizzes' short_answer does).

import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const activityTypeSchema = z.enum(['multiple_choice_single', 'true_false'])

const addActivitySchema = z.object({
    missionId: z.string().uuid(),
    prompt: z.string().min(2, 'Activity prompt is too short'),
    activityType: activityTypeSchema,
    options: z.string().optional(),
    correctAnswer: z.string().min(1, 'Enter the correct answer'),
    hintText: z.string().optional(),
    // Optional: marks this new activity as the fallback shown when a
    // student is still wrong after the hint on an EXISTING activity
    // (Day 4's plan for remediates_activity_id). Left unset by default
    // — a teacher can only meaningfully wire this up once there's more
    // than one activity in the mission to point at.
    remediatesActivityId: z.string().uuid().optional(),
})

export type AddActivityResult = { ok: true; missionPublished: boolean } | { ok: false; error: string }

// Adds one activity, plus its answer options, to an existing mission.
// Mirrors addQuestion.
export async function addActivity(formData: FormData): Promise<AddActivityResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = addActivitySchema.safeParse({
        missionId: formData.get('missionId'),
        prompt: formData.get('prompt'),
        activityType: formData.get('activityType'),
        // formData.get() returns null when a field isn't present at
        // all — same normalization null -> undefined as addQuestion,
        // since Zod's .optional() only accepts undefined.
        options: formData.get('options') ?? undefined,
        correctAnswer: formData.get('correctAnswer'),
        hintText: formData.get('hintText') ?? undefined,
        remediatesActivityId: formData.get('remediatesActivityId') || undefined,
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { missionId, prompt, activityType, options, correctAnswer, remediatesActivityId } = parsed.data
    const hintText =
        parsed.data.hintText && parsed.data.hintText.trim() !== '' ? parsed.data.hintText.trim() : null

    const { data: mission } = await supabase
        .from('missions')
        .select('id, is_published, lessons!inner(courses!inner(teacher_id))')
        .eq('id', missionId)
        .single()

    if (!mission || (mission as any).lessons.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this mission.' }
    }

    if (activityType === 'multiple_choice_single') {
        const optionTexts = (options ?? '')
            .split(',')
            .map((text) => text.trim())
            .filter(Boolean)
        if (optionTexts.length < 2) {
            return { ok: false, error: 'Add at least two answer options.' }
        }
    }

    // Same order_index fix as addQuestion — count existing activities
    // first so a new one always appends after the current last one.
    const { count } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('mission_id', missionId)

    const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert({
            mission_id: missionId,
            prompt,
            activity_type: activityType,
            points: 1,
            hint_text: hintText,
            order_index: count ?? 0,
            remediates_activity_id: remediatesActivityId ?? null,
        })
        .select('id')
        .single()

    if (activityError || !activity) {
        return { ok: false, error: 'Could not save the activity.' }
    }

    let optionRows: { activity_id: string; option_text: string; is_correct: boolean; order_index: number }[] = []

    if (activityType === 'true_false') {
        optionRows = [
            { activity_id: activity.id, option_text: 'True', is_correct: correctAnswer === 'True', order_index: 0 },
            { activity_id: activity.id, option_text: 'False', is_correct: correctAnswer === 'False', order_index: 1 },
        ]
    } else {
        const optionTexts = (options ?? '')
            .split(',')
            .map((text) => text.trim())
            .filter(Boolean)
        optionRows = optionTexts.map((text, index) => ({
            activity_id: activity.id,
            option_text: text,
            is_correct: text === correctAnswer,
            order_index: index,
        }))
    }

    const { error: optionsError } = await supabase.from('activity_options').insert(optionRows)

    if (optionsError) {
        return { ok: false, error: 'Could not save the answer options.' }
    }

    return { ok: true, missionPublished: (mission as any).is_published }
}

const updateActivitySchema = z.object({
    activityId: z.string().uuid(),
    prompt: z.string().min(2, 'Activity prompt is too short'),
    activityType: activityTypeSchema,
    options: z.string().optional(),
    correctAnswer: z.string().min(1, 'Enter the correct answer'),
    hintText: z.string().optional(),
    // REMEDIATION FIX (2026-08-30, continued conversation): addActivity
    // already accepted this field (see its own comment above — "a
    // teacher can only meaningfully wire this up once there's more
    // than one activity in the mission to point at"), but updateActivity
    // never did, and no UI anywhere ever actually sent it — meaning
    // this feature has been unreachable in practice since it was built.
    // Empty string (the "None" option in the picker) means "clear the
    // remediation link" — handled explicitly below, not left to
    // Zod's .optional() alone, since an empty string isn't `undefined`.
    remediatesActivityId: z.string().optional(),
})

export type UpdateActivityResult = { ok: true; missionPublished: boolean } | { ok: false; error: string }

// Edits an existing activity in place. Answer options are replaced
// wholesale (delete then re-insert), same as updateQuestion.
export async function updateActivity(formData: FormData): Promise<UpdateActivityResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = updateActivitySchema.safeParse({
        activityId: formData.get('activityId'),
        prompt: formData.get('prompt'),
        activityType: formData.get('activityType'),
        options: formData.get('options') ?? undefined,
        correctAnswer: formData.get('correctAnswer'),
        hintText: formData.get('hintText') ?? undefined,
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { activityId, prompt, activityType, options, correctAnswer } = parsed.data
    const hintText =
        parsed.data.hintText && parsed.data.hintText.trim() !== '' ? parsed.data.hintText.trim() : null

    // Empty string ("None" in the picker) clears the link; anything
    // else must be a real uuid pointing at a DIFFERENT activity — an
    // activity can't remediate itself, that's a meaningless self-loop
    // AddActivityForm's picker prevents by construction (it never
    // lists the activity being edited as an option), but this is
    // re-checked server-side rather than trusted from the client.
    const rawRemediatesId = parsed.data.remediatesActivityId
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

    const { error: updateError } = await supabase
        .from('activities')
        .update({
            prompt,
            activity_type: activityType,
            hint_text: hintText,
            remediates_activity_id: remediatesActivityId,
        })
        .eq('id', activityId)

    if (updateError) {
        return { ok: false, error: 'Could not save the activity.' }
    }

    // Wipe existing options, then rebuild from scratch below — same
    // approach as updateQuestion, keeps order_index/is_correct
    // consistent with whatever the teacher just edited.
    const { error: deleteOptionsError } = await supabase
        .from('activity_options')
        .delete()
        .eq('activity_id', activityId)

    if (deleteOptionsError) {
        return { ok: false, error: 'Could not update the answer options.' }
    }

    let optionRows: { activity_id: string; option_text: string; is_correct: boolean; order_index: number }[] = []

    if (activityType === 'true_false') {
        optionRows = [
            { activity_id: activityId, option_text: 'True', is_correct: correctAnswer === 'True', order_index: 0 },
            { activity_id: activityId, option_text: 'False', is_correct: correctAnswer === 'False', order_index: 1 },
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
            activity_id: activityId,
            option_text: text,
            is_correct: text === correctAnswer,
            order_index: index,
        }))
    }

    const { error: optionsError } = await supabase.from('activity_options').insert(optionRows)

    if (optionsError) {
        return { ok: false, error: 'Could not save the answer options.' }
    }

    return { ok: true, missionPublished: (activity as any).missions.is_published }
}

export type DeleteActivityResult = { ok: true; missionPublished: boolean } | { ok: false; error: string }

// Deletes an activity and its answer options (FK cascade handles the
// options). Ownership checked the same way as updateActivity — through
// the activity's mission, through the mission's lesson, to the
// lesson's course, to the course's teacher_id. Mirrors deleteQuestion.
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

    const { error } = await supabase.from('activities').delete().eq('id', activityId)

    if (error) {
        return { ok: false, error: 'Could not delete the activity. Please try again.' }
    }

    return { ok: true, missionPublished: (activity as any).missions.is_published }
}
