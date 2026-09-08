// features/missions/actions/get-mission-for-student.ts
//
// Mirrors features/quizzes/actions/get-quiz-for-student.ts, but there
// is no single precedent function to copy 1:1 — quizzes has nothing
// shaped like "list of missions in a lesson with this student's
// aggregate progress joined in". The closest quiz analog is
// getQuizOverviewForStudent's attempt-joining logic, but that loads a
// SINGLE quiz's attempt history, not a list. This file's shape is new
// for that reason, per HANDOFF.md's Day 3 note that MissionPath.tsx
// has "no direct precedent to mirror".
//
// What IS mirrored exactly: reading multiple-choice option text
// without is_correct. Quizzes' getQuizForStudent reads from
// answer_options_for_student, a DB view with is_correct left out
// entirely — "even if this code has a mistake, the database still
// refuses to hand back the answer key." Per HANDOFF.md's Day 1 entry,
// activity_options_for_student was created the same way in migration
// 082, so this file reads from that view for the same guarantee. (Day
// 3 doesn't actually need option text at all — the path only shows
// mission-level status, not activity content — but getMissionPreview
// below is included for a "peek before you start" case some UIs want;
// skip calling it if that's not needed yet.)
//
// KEY DESIGN DECISION, not documented anywhere else: mission_progress
// has no direct write policy (service-role only, per HANDOFF.md's
// Day 1 note), so a brand-new student has ZERO rows in that table.
// Without a bootstrapping rule, every mission would read as its schema
// default ('locked') and nobody could ever start.
//
// BOOTSTRAPPING RULE FIXED (2026-09-07): originally, a missing row
// unlocked ONLY if the mission was literally first in the lesson
// (index === 0) — every other missing row defaulted locked, full
// stop. Confirmed bug, not a misunderstanding: `ensureNextMissionUnlocked`
// in submit-question-attempt.ts DOES insert a real 'unlocked' row for
// the next mission the moment the current one is mastered — but only
// for missions that already EXIST at that moment. If a teacher creates
// Mission 2 AFTER a student has already mastered Mission 1, Mission 2
// never existed when that unlock fired, so it never got a row, and
// since it's not literally position 0, it defaulted locked forever —
// with no way to ever unlock it, since replaying an already-mastered
// Mission 1 never re-triggers the unlock (non-destructive replay never
// writes). Fixed here: missions are now walked in order, and a missing
// row unlocks if the PREVIOUS mission in that order is mastered (a
// real row, or itself a computed default) — not "is this exactly
// index 0." This correctly covers both the original case (first
// mission, no predecessor, always unlocked) and the bug case (a
// mission created after its predecessor was already mastered).

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'

export type MissionStatus = 'locked' | 'unlocked' | 'mastered'

export type MissionForStudent = {
    id: string
    title: string
    description: string | null
    orderIndex: number
    masteryThreshold: number
    status: MissionStatus
    correctStreak: number
    masteredAt: string | null
}

export async function getMissionsForStudent(lessonId: string): Promise<MissionForStudent[]> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: missions, error: missionsError } = await supabase
        .from('missions')
        .select('id, title, description, order_index, mastery_threshold')
        .eq('lesson_id', lessonId)
        .eq('is_published', true)
        .order('order_index')

    if (missionsError) {
        throw new Error('Could not load missions')
    }

    const missionRows = missions ?? []
    const missionIds = missionRows.map((m) => m.id)

    const { data: progress, error: progressError } = await supabase
        .from('mission_progress')
        .select('mission_id, status, correct_streak, mastered_at')
        .eq('student_id', user.id)
        .in('mission_id', missionIds)

    if (progressError) {
        throw new Error('Could not load mission progress')
    }

    const progressByMissionId = new Map((progress ?? []).map((p) => [p.mission_id, p]))

    // Walked sequentially (not .map()) specifically because each
    // mission's default status now depends on whatever status the
    // PREVIOUS mission in this same pass just resolved to — a plain
    // .map() can't see its own prior iteration's output.
    let previousMastered = true // nothing precedes the first mission — always eligible
    const result: MissionForStudent[] = []
    for (const mission of missionRows) {
        const existing = progressByMissionId.get(mission.id)

        let status: MissionStatus
        let correctStreak: number
        let masteredAt: string | null

        if (existing) {
            status = existing.status as MissionStatus
            correctStreak = existing.correct_streak
            masteredAt = existing.mastered_at
        } else {
            // No row yet — apply the bootstrapping default: unlocked
            // only if the mission before this one (in order) is
            // mastered, per this function's header comment above.
            status = previousMastered ? 'unlocked' : 'locked'
            correctStreak = 0
            masteredAt = null
        }

        previousMastered = status === 'mastered'

        result.push({
            id: mission.id,
            title: mission.title,
            description: mission.description,
            orderIndex: mission.order_index,
            masteryThreshold: mission.mastery_threshold,
            status,
            correctStreak,
            masteredAt,
        })
    }

    return result
}

// One question within an activity, student-facing — no is_correct
// anywhere on this type, same guarantee ActivityPreviewForStudent
// always had, now one level deeper.
export type QuestionPreviewForStudent = {
    id: string
    prompt: string
    questionType: string
    orderIndex: number
    hintText: string | null
    options: { id: string; optionText: string }[]
    // Same seeding purpose as the old ActivityPreviewForStudent's
    // initialCorrectStreak/isMastered, now scoped to ONE question
    // instead of one whole activity — ActivityRunner.tsx's in-session
    // queue is seeded per question, since mastery now lives per
    // question (question_mastery), not per activity.
    initialCorrectStreak: number
    isMastered: boolean
}

export type ActivityPreviewForStudent = {
    id: string
    prompt: string
    activityType: string
    orderIndex: number
    // NEW: the container's own questions. Replaces the old flat
    // `options` field — an activity itself no longer has options
    // directly, only its questions do.
    questions: QuestionPreviewForStudent[]
        // Rollup, computed here the same way submit-question-attempt.ts
    // computes it when deciding whether to write activity_mastery:
    // true only when EVERY question in `questions` is individually
    // mastered. Used for this file's own "unmastered first" initial
    // sort below, same purpose the old per-activity isMastered served.
    isMastered: boolean
    masteredQuestionCount: number
    totalQuestionCount: number
}

export type MissionPreviewForStudent = {
    id: string
    title: string
    description: string | null
    masteryThreshold: number
    // NEW (migration 100): teacher-controlled — when true, the client
    // (ActivityRunner.tsx) shuffles each question's options before
    // display. Resolved client-side, not here, since option order has
    // no security implication (is_correct is never sent to the
    // client at all, per this file's is_correct-omitted guarantee) —
    // shuffling server-side would only add a query-time cost with no
    // real benefit.
    shuffleOptions: boolean
    activities: ActivityPreviewForStudent[]
}

/**
 * Loads a single mission's activities — each with its own nested
 * questions — for the student to work through. The mission-detail
 * equivalent of getQuizForStudent. Included for ActivityRunner.tsx to
 * build on; not required for the path view itself, which only needs
 * getMissionsForStudent above.
 *
 * Same guarantee as getQuizForStudent, now one level deeper: this
 * never returns is_correct anywhere, because question options are
 * read from activity_question_options_for_student (migration 094), a
 * view that leaves is_correct out entirely — same pattern as the
 * existing activity_options_for_student view this file used to read
 * activity-level options from before this rework.
 */
export async function getMissionPreviewForStudent(missionId: string): Promise<MissionPreviewForStudent> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: mission, error: missionError } = await supabase
        .from('missions')
        .select('id, title, description, mastery_threshold, shuffle_options')
        .eq('id', missionId)
        .eq('is_published', true)
        .single()

    if (missionError || !mission) {
        throw new Error('Mission not found')
    }

    const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id, prompt, activity_type, order_index')
        .eq('mission_id', missionId)
        .order('order_index')

    if (activitiesError) {
        throw new Error('Could not load activities')
    }

    const activityIds = (activities ?? []).map((a) => a.id)

    // NEW: every question belonging to every activity in this mission,
    // fetched in one query rather than per-activity — same "fetch flat,
    // group in memory" shape the old code already used for options.
    const { data: questions, error: questionsError } = await supabase
        .from('activity_questions')
        .select('id, activity_id, prompt, question_type, order_index, hint_text')
        .in('activity_id', activityIds)
        .order('order_index')

    if (questionsError) {
        throw new Error('Could not load activity questions')
    }

    const questionIds = (questions ?? []).map((q) => q.id)

    // Reads from the NEW activity_question_options_for_student view
    // (migration 094) — mirrors activity_options_for_student's exact
    // is_correct-omitted shape, one level deeper (question_id instead
    // of activity_id).
    const { data: options, error: optionsError } = await supabase
        .from('activity_question_options_for_student')
        .select('id, question_id, option_text, order_index')
        .in('question_id', questionIds)
        .order('order_index')

    if (optionsError) {
        throw new Error('Could not load answer options')
    }

    // Per-QUESTION mastery (migration 094's question_mastery table) —
    // replaces the old per-activity activity_mastery read for this
    // purpose. Same "no row = not yet mastered" reasoning as before:
    // a question the student has never attempted is treated as
    // unmastered with streak 0, not an error.
    const { data: masteryRows, error: masteryError } = await supabase
        .from('question_mastery')
        .select('question_id, correct_streak, state')
        .eq('student_id', user.id)
        .in('question_id', questionIds)

    if (masteryError) {
        throw new Error('Could not load question mastery')
    }

    const masteryByQuestionId = new Map((masteryRows ?? []).map((m) => [m.question_id, m]))

    const questionsByActivityId = new Map<string, QuestionPreviewForStudent[]>()
    for (const question of questions ?? []) {
        const mastery = masteryByQuestionId.get(question.id)
        const preview: QuestionPreviewForStudent = {
            id: question.id,
            prompt: question.prompt,
            questionType: question.question_type,
            orderIndex: question.order_index,
            hintText: question.hint_text,
            options: (options ?? [])
                .filter((o) => o.question_id === question.id)
                .map((o) => ({ id: o.id, optionText: o.option_text })),
            initialCorrectStreak: mastery?.correct_streak ?? 0,
            isMastered: mastery?.state === 'mastered',
        }
        const existing = questionsByActivityId.get(question.activity_id) ?? []
        existing.push(preview)
        questionsByActivityId.set(question.activity_id, existing)
    }

    // Rollup per activity: mastered only if it has at least one
    // question AND every one of them is mastered. An activity with
    // zero questions (shouldn't happen given create-mission.ts's own
    // "never write an empty mission/activity" validation, but not
    // assumed impossible here) is treated as NOT mastered rather than
    // vacuously true, so it never gets sorted as "done" ahead of
    // activities that actually have content.
        function getActivityMasteryRollup(activityId: string): {
        isMastered: boolean
        masteredCount: number
        totalCount: number
    } {
        const activityQuestions = questionsByActivityId.get(activityId) ?? []
        const totalCount = activityQuestions.length
        const masteredCount = activityQuestions.filter((q) => q.isMastered).length
        return {
            isMastered: totalCount > 0 && masteredCount === totalCount,
            masteredCount,
            totalCount,
        }
    }

    // Stable partition: unmastered first, mastered last — same
    // ordering rule as before, now driven by the computed rollup
    // instead of a direct activity_mastery read.
    const sortedActivities = [...(activities ?? [])].sort((a, b) => {
        const aMastered = getActivityMasteryRollup(a.id).isMastered ? 1 : 0
        const bMastered = getActivityMasteryRollup(b.id).isMastered ? 1 : 0
        return aMastered - bMastered
    })

    const activitiesWithQuestions: ActivityPreviewForStudent[] = sortedActivities.map((activity) => {
        const rollup = getActivityMasteryRollup(activity.id)
        return {
            id: activity.id,
            prompt: activity.prompt,
            activityType: activity.activity_type,
            orderIndex: activity.order_index,
            questions: (questionsByActivityId.get(activity.id) ?? []).sort((a, b) => a.orderIndex - b.orderIndex),
            isMastered: rollup.isMastered,
            masteredQuestionCount: rollup.masteredCount,
            totalQuestionCount: rollup.totalCount,
        }
    })

    return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        masteryThreshold: mission.mastery_threshold,
        shuffleOptions: mission.shuffle_options,
        activities: activitiesWithQuestions,
    }
}
