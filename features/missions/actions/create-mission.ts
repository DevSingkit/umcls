'use server'
// Mission-level actions for the gamified mastery-loop builder. Mirrors
// the quiz-level half of features/quizzes/actions/create-quiz.ts
// (createQuiz / createQuizWithFirstQuestion / getQuizForTeacher / the
// setter functions). Activity-level actions (the addQuestion /
// updateQuestion / deleteQuestion equivalents) live in
// create-activity.ts instead — this project splits mission-level and
// activity-level actions into two files, unlike quizzes' single
// combined file, per the Day 2 plan in HANDOFF.md.
//
// Ownership check differs from quizzes: quizzes.course_id points
// straight at courses, but missions only has lesson_id — every
// ownership check here goes lesson -> course -> teacher_id (two-hop
// embed) instead of quizzes' one-hop courses!inner(teacher_id).
//
// Short-answer activities are intentionally NOT supported here — the
// activities table has no column to store a reference answer for
// auto-grading. Unlike quizzes' short_answer (stored in
// questions.explanation for manual teacher grading later),
// attempt_events.is_correct is NOT NULL, so an activity needs an
// immediate right/wrong at attempt time. Only multiple_choice_single
// and true_false are accepted until that schema gap is addressed. Note
// the DB CHECK constraint on activities.activity_type still permits
// 'short_answer' — nothing stops a row with that value from being
// inserted outside this file, this is only an application-level
// restriction.

import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const activityTypeSchema = z.enum(['multiple_choice_single', 'true_false'])

const createMissionSchema = z.object({
    lessonId: z.string().uuid(),
    title: z.string().min(2, 'Give this mission a name (at least 2 characters).'),
    description: z.string().optional(),
    masteryThreshold: z.string().optional(),
    // First activity — same "never write an empty mission" principle
    // as createQuizWithFirstQuestion below.
    prompt: z.string().min(2, 'Activity prompt is too short'),
    activityType: activityTypeSchema,
    options: z.string().optional(),
    correctAnswer: z.string().min(1, 'Enter the correct answer'),
    hintText: z.string().optional(),
    publish: z.string().optional(),
})

export type CreateMissionResult = { ok: true; missionId: string } | { ok: false; error: string }

// A mission row is only ever written once a title AND a real first
// activity exist together, inserted in the same action — same
// reasoning as createQuizWithFirstQuestion: there should never be a
// moment a titled-but-empty mission exists in the database.
export async function createMissionWithFirstActivity(formData: FormData): Promise<CreateMissionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = createMissionSchema.safeParse({
        lessonId: formData.get('lessonId'),
        title: formData.get('title'),
        description: formData.get('description') ?? undefined,
        masteryThreshold: formData.get('masteryThreshold') ?? undefined,
        prompt: formData.get('prompt'),
        activityType: formData.get('activityType'),
        options: formData.get('options') ?? undefined,
        correctAnswer: formData.get('correctAnswer'),
        hintText: formData.get('hintText') ?? undefined,
        publish: formData.get('publish') ?? undefined,
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { lessonId, title, description, prompt, activityType, options, correctAnswer } = parsed.data

    const masteryThreshold = parsed.data.masteryThreshold ? Number(parsed.data.masteryThreshold) : 3
    if (!Number.isInteger(masteryThreshold) || masteryThreshold < 1) {
        return { ok: false, error: 'Mastery threshold must be at least 1.' }
    }

    const hintText =
        parsed.data.hintText && parsed.data.hintText.trim() !== '' ? parsed.data.hintText.trim() : null
    const publish = parsed.data.publish === 'true'

    // Validate the activity content BEFORE creating anything — same
    // order as createQuizWithFirstQuestion, a bad activity should never
    // leave a half-created mission behind.
    if (activityType === 'multiple_choice_single') {
        const optionTexts = (options ?? '')
            .split(',')
            .map((text) => text.trim())
            .filter(Boolean)
        if (optionTexts.length < 2) {
            return { ok: false, error: 'Add at least two answer options.' }
        }
    }

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id, courses!inner(teacher_id)')
        .eq('id', lessonId)
        .single()

    if (!lesson || (lesson as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this lesson.' }
    }

    // Same order_index fix as questions in create-quiz.ts: count
    // existing missions on this lesson so a new one always appends
    // after the current last one instead of tying at the schema
    // default of 0.
    const { count } = await supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('lesson_id', lessonId)

    const { data: mission, error: missionError } = await supabase
        .from('missions')
        .insert({
            lesson_id: lessonId,
            title,
            description: description && description.trim() !== '' ? description.trim() : null,
            order_index: count ?? 0,
            mastery_threshold: masteryThreshold,
            is_published: publish,
            created_by: user.id,
        })
        .select('id')
        .single()

    if (missionError || !mission) {
        return { ok: false, error: 'Could not create the mission. Please try again.' }
    }

    const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert({
            mission_id: mission.id,
            prompt,
            activity_type: activityType,
            points: 1,
            hint_text: hintText,
            order_index: 0,
        })
        .select('id')
        .single()

    if (activityError || !activity) {
        // Roll back the mission row — don't leave an empty mission
        // behind just because the activity failed to save. Same
        // principle as createQuizWithFirstQuestion's rollback.
        await supabase.from('missions').delete().eq('id', mission.id)
        return { ok: false, error: 'Could not save the first activity. Please try again.' }
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
        // Same rollback principle — a half-saved activity with no
        // options is just as much an "empty" mission in practice.
        await supabase.from('missions').delete().eq('id', mission.id)
        return { ok: false, error: 'Could not save the answer options. Please try again.' }
    }

    return { ok: true, missionId: mission.id }
}

// Loads a mission and its activities, including each activity's answer
// options, for the teacher to review while building it. Mirrors
// getQuizForTeacher, including its admin-client read-through:
// answer_options has SELECT fully revoked from `authenticated`
// (migration 019), and per HANDOFF.md's Day-1 note "RLS mirrors
// quizzes pattern exactly", activity_options is assumed to follow the
// same grant. That assumption isn't independently confirmed against a
// live grants dump here — worth a quick check the first time this runs
// against real data. If activity_options DOES grant authenticated
// SELECT, this still works fine, it's just a stricter read than
// strictly necessary since ownership was already verified above.
export async function getMissionForTeacher(missionId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: mission } = await supabase
        .from('missions')
        .select(
            'id, title, description, lesson_id, is_published, mastery_threshold, order_index, lessons!inner(title, course_id, courses!inner(teacher_id, title))'
        )
        .eq('id', missionId)
        .single()

    if (!mission || (mission as any).lessons.courses.teacher_id !== user.id) {
        return null
    }

    const supabaseAdmin = createAdminClient()
    const { data: activities, error: activitiesError } = await supabaseAdmin
        .from('activities')
        .select(
            'id, prompt, activity_type, points, hint_text, order_index, remediates_activity_id, activity_options(id, option_text, is_correct, order_index)'
        )
        .eq('mission_id', missionId)
        .order('order_index')

    if (activitiesError) {
        console.error('getMissionForTeacher: failed to load activities', activitiesError)
    }

    const activitiesWithSortedOptions = (activities ?? []).map((a: any) => ({
        ...a,
        activity_options: [...(a.activity_options ?? [])].sort((x, y) => x.order_index - y.order_index),
    }))

    return { mission, activities: activitiesWithSortedOptions }
}

export type MissionSummary = {
    id: string
    title: string
    is_published: boolean
    order_index: number
    activityCount: number
}

// Lists missions for a lesson, teacher view — used on the lesson page
// to show what's already built plus a link to add more. This mirrors
// the shape MaterialList/listMaterials already established on that
// page (a list fetched server-side, handed to a small list
// component), not any quiz precedent — quizzes have no per-lesson list
// like this since they aren't lesson-scoped the way missions are.
export async function listMissionsForTeacher(lessonId: string): Promise<MissionSummary[]> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, courses!inner(teacher_id)')
        .eq('id', lessonId)
        .single()

    if (!lesson || (lesson as any).courses.teacher_id !== user.id) {
        return []
    }

    const { data: missions, error } = await supabase
        .from('missions')
        .select('id, title, is_published, order_index, activities(id)')
        .eq('lesson_id', lessonId)
        .order('order_index')

    if (error) {
        console.error('listMissionsForTeacher: failed to load missions', error)
        return []
    }

    return (missions ?? []).map((m: any) => ({
        id: m.id,
        title: m.title,
        is_published: m.is_published,
        order_index: m.order_index,
        activityCount: (m.activities ?? []).length,
    }))
}

const updateMissionSettingsSchema = z.object({
    missionId: z.string().uuid(),
    title: z.string().min(2, 'Title is too short'),
    description: z.string().optional(),
    masteryThreshold: z.string().optional(),
    publish: z.string().optional(),
})

export type UpdateMissionSettingsResult = { ok: true } | { ok: false; error: string }

// Combined title/description/mastery-threshold/publish setter — one
// Save button, same shape as saveQuizSettingsAndPublish, deliberately
// skipping quizzes' older per-field-setter pattern since missions have
// far fewer settings and quizzes itself moved away from that pattern
// on 2026-08-19. Publishing is one-way from here for the same reason
// saveQuizSettingsAndPublish made publish one-way: once live, a
// mission should not be silently unpublished via this form.
//
// NOT included here: a resetQuizAttempts equivalent. Resetting
// mission_progress/attempt_events after an edit is real Day-4
// territory (mission_progress has no direct write policy — writes are
// service-role only per HANDOFF.md's Day-1 note — so this needs a
// purpose-built RPC that doesn't exist yet, same family as
// reset_quiz_attempts). Flagging so this parity gap isn't silently
// lost before Day 4.
export async function updateMissionSettings(formData: FormData): Promise<UpdateMissionSettingsResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = updateMissionSettingsSchema.safeParse({
        missionId: formData.get('missionId'),
        title: formData.get('title'),
        description: formData.get('description') ?? undefined,
        masteryThreshold: formData.get('masteryThreshold') ?? undefined,
        publish: formData.get('publish') ?? undefined,
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { missionId, title, description } = parsed.data

    const masteryThreshold = parsed.data.masteryThreshold ? Number(parsed.data.masteryThreshold) : 3
    if (!Number.isInteger(masteryThreshold) || masteryThreshold < 1) {
        return { ok: false, error: 'Mastery threshold must be at least 1.' }
    }

    const { data: mission } = await supabase
        .from('missions')
        .select('id, is_published, lessons!inner(courses!inner(teacher_id))')
        .eq('id', missionId)
        .single()

    if (!mission || (mission as any).lessons.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this mission.' }
    }

    const requestedPublish = parsed.data.publish === 'true'
    const publish = (mission as any).is_published ? true : requestedPublish

    const { data: updated, error } = await supabase
        .from('missions')
        .update({
            title,
            description: description && description.trim() !== '' ? description.trim() : null,
            mastery_threshold: masteryThreshold,
            is_published: publish,
        })
        .eq('id', missionId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save this mission: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not save this mission — the update did not apply.' }
    }

    return { ok: true }
}

// GAP #2 FIX (2026-08-30, continued conversation): wipes every
// student's progress on this mission (mission_progress, attempt_events
// on its activities, activity_mastery on its activities) via the
// reset_mission_progress RPC (migration 093), mirroring
// resetQuizAttempts's exact shape for the equivalent quiz gap. See
// that migration's own header for why THREE tables need clearing here
// instead of quizzes' two.
//
// Ownership is enforced by the RPC itself (SECURITY DEFINER, explicit
// teacher_id check in SQL) — this action just calls it and translates
// the result, same pattern as deleteStreamItem for the RPC family.
export type ResetMissionProgressResult =
    | { ok: true; affectedStudents: number }
    | { ok: false; error: string }

export async function resetMissionProgress(missionId: string): Promise<ResetMissionProgressResult> {
    await requireRole(['teacher'])
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('reset_mission_progress', { p_mission_id: missionId })

    if (error) {
        return { ok: false, error: `Could not reset progress: ${error.message}` }
    }

    return { ok: true, affectedStudents: (data as number) ?? 0 }
}
