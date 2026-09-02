'use server'
// features/missions/actions/submit-question-attempt.ts
//
// MIGRATION 094 REWRITE (2026-09-01): renamed/reworked from
// submit-activity-attempt.ts's submitActivityAttempt. An activity is
// now a container of multiple activity_questions — grading, mastery,
// and the requeue signal all move to QUESTION granularity. Three
// tables get written per submit now, not two:
//   - attempt_events: same immutable log as before, now carries BOTH
//     activity_id (unchanged, still NOT NULL) and question_id (new,
//     migration 094).
//   - question_mastery: the REAL 3-in-a-row streak, one row per
//     (student, question) — this replaces activity_mastery's old job.
//   - activity_mastery: still written, but now a derived ROLLUP —
//     "how many of this activity's questions has this student
//     mastered." Its `correct_streak` column is repurposed to hold
//     that count, NOT a literal streak. `state` is 'mastered' only
//     once every question in the activity is mastered.
//
// UI COPY RULE (confirmed by user, enforced by field naming below):
// question-level results use `questionCorrectStreak` — "streak"
// language is fine here. Activity-level results use
// `activityMasteredQuestionCount`/`activityTotalQuestionCount` —
// never call this a streak in the UI, even though the underlying
// column is still named correct_streak in the database.
//
// MISSION-LEVEL LOGIC UNCHANGED: mission_progress's own correct_streak
// (Phase 0's original locked rule — 3-in-a-row ANYWHERE in the
// mission, independent of which activity/question) is untouched by
// this migration. It's computed here exactly as
// submitActivityAttempt always did, just fed by a question-level
// isCorrect instead of an activity-level one — the boolean itself
// means the same thing either way.
//
// REMEDIATION STAYS ACTIVITY-LEVEL: migration 094 added
// activity_questions.remediates_question_id, but the teacher-authoring
// UI (AddActivityForm.tsx/ActivityCard.tsx, this same session) never
// exposed it — remediation is still configured on `activities.
// remediates_activity_id`, unchanged from before this migration. This
// function checks that same column, not the new question-level one,
// to stay consistent with what teachers can actually set.
//
// "FIRST PASS COMPLETE" REDEFINED: the old check
// (activity_mastery.correct_streak >= 1, meaning "this activity's most
// recent answer was correct") no longer means that — that column is
// now a mastered-question COUNT, a different concept entirely. Reusing
// it as-is would have been a silent correctness bug. Redefined here as
// "every question in every activity of the mission has been answered
// correctly at least once," read from question_mastery.correct_streak
// >= 1 (the table that now actually holds a real per-item streak),
// which is the direct, correct successor to what the old check meant.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/get-current-user'
import { getMissionsForStudent } from './get-mission-for-student'

const QUESTION_MASTERY_STREAK_TARGET = 3
const HINT_AFTER_ATTEMPTS = 2
const REMEDIATION_AFTER_ATTEMPTS = 3

type SubmitQuestionAttemptInput = {
    activityId: string
    questionId: string
    selectedOptionId: string
    hintWasVisible: boolean
}

export type SubmitQuestionAttemptResult =
    | {
          ok: true
          isCorrect: boolean
          attemptsOnThisQuestion: number
          hintText: string | null
          remediationActivityId: string | null
          // Mission-wide (Phase 0, unchanged concept).
          correctStreak: number
          masteryThreshold: number
          justMastered: boolean
          unlockedNextMissionId: string | null
          // Question-level — "streak" language is correct here.
          questionCorrectStreak: number
          questionMasteryState: 'new' | 'learning' | 'mastered'
          // Activity-level rollup — NEVER "streak" in the UI.
          activityMasteredQuestionCount: number
          activityTotalQuestionCount: number
          activityMasteryState: 'new' | 'learning' | 'mastered'
      }
    | { ok: false; error: string }

/**
 * Grades one question submit within an activity, updates
 * question_mastery, rolls that up into activity_mastery, and updates
 * the mission-wide streak exactly as submitActivityAttempt always did.
 */
export async function submitQuestionAttempt(
    input: SubmitQuestionAttemptInput
): Promise<SubmitQuestionAttemptResult> {
    const user = await requireRole(['student'])
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const { data: question, error: questionError } = await supabase
        .from('activity_questions')
        .select(
            'id, activity_id, hint_text, activities!inner(id, mission_id, remediates_activity_id, missions!inner(id, lesson_id, is_published, mastery_threshold, order_index))'
        )
        .eq('id', input.questionId)
        .eq('activity_id', input.activityId)
        .single()

    if (questionError || !question) {
        return { ok: false, error: 'Question not found' }
    }

    const activity = (question as any).activities
    const mission = activity.missions

    if (!mission.is_published) {
        return { ok: false, error: 'This mission is not available' }
    }

    // Same locked-mission defense-in-depth as before — the UI never
    // links to a locked mission, but this is the real enforcement.
    const missions = await getMissionsForStudent(mission.lesson_id)
    const missionState = missions.find((m) => m.id === mission.id)
    if (!missionState || missionState.status === 'locked') {
        return { ok: false, error: 'This mission is locked' }
    }

    // Replaying an already-mastered mission never writes to
    // question_mastery/activity_mastery/mission_progress — same
    // non-destructive-replay rule Phase 0 locked, just re-scoped to
    // question granularity. attempt_events still logs it.
    const isReviewOfMasteredMission = missionState.status === 'mastered'

    // Grade against the RLS-safe admin read (same pattern
    // submitActivityAttempt always used — is_correct is never exposed
    // to the student client, only resolved here server-side).
    const { data: options, error: optionsError } = await supabaseAdmin
        .from('activity_question_options')
        .select('id, is_correct')
        .eq('question_id', input.questionId)

    if (optionsError || !options) {
        return { ok: false, error: 'Could not load answer options' }
    }

    const selectedOption = options.find((o) => o.id === input.selectedOptionId)
    if (!selectedOption) {
        return { ok: false, error: 'Invalid answer option' }
    }
    const isCorrect = selectedOption.is_correct

    // Consecutive-wrong run on THIS QUESTION specifically — drives the
    // hint/remediation thresholds. Was activity-scoped before; now
    // question-scoped, since that's the real unit of retry now.
    const { data: recentAttempts } = await supabaseAdmin
        .from('attempt_events')
        .select('is_correct')
        .eq('student_id', user.id)
        .eq('question_id', input.questionId)
        .order('created_at', { ascending: false })
        .limit(10)

    let consecutiveWrongSoFar = 0
    for (const attempt of recentAttempts ?? []) {
        if (attempt.is_correct) break
        consecutiveWrongSoFar += 1
    }
    const attemptsOnThisQuestion = consecutiveWrongSoFar + 1

    const { count: priorAttemptCount } = await supabaseAdmin
        .from('attempt_events')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('question_id', input.questionId)

    await supabaseAdmin.from('attempt_events').insert({
        student_id: user.id,
        activity_id: input.activityId,
        question_id: input.questionId,
        selected_option_id: input.selectedOptionId,
        is_correct: isCorrect,
        hint_shown: input.hintWasVisible,
        attempt_number: (priorAttemptCount ?? 0) + 1,
    })

    let hintText: string | null = null
    let remediationActivityId: string | null = null

    if (!isCorrect) {
        if (attemptsOnThisQuestion >= HINT_AFTER_ATTEMPTS) {
            hintText = question.hint_text
        }
        if (attemptsOnThisQuestion >= REMEDIATION_AFTER_ATTEMPTS) {
            // Same activity-level lookup as before: does some OTHER
            // activity name this one as the thing it remediates?
            const { data: remediationActivity } = await supabaseAdmin
                .from('activities')
                .select('id')
                .eq('remediates_activity_id', input.activityId)
                .limit(1)
                .maybeSingle()
            remediationActivityId = remediationActivity?.id ?? null
        }
    }

    const { correctStreak: questionCorrectStreak, state: questionMasteryState } = await resolveQuestionMastery(
        supabaseAdmin,
        user.id,
        input.questionId,
        isCorrect,
        input.hintWasVisible,
        !isReviewOfMasteredMission
    )

    const {
        masteredCount: activityMasteredQuestionCount,
        totalCount: activityTotalQuestionCount,
        state: activityMasteryState,
    } = await resolveActivityMasteryRollup(supabaseAdmin, user.id, input.activityId, !isReviewOfMasteredMission)

    if (isReviewOfMasteredMission) {
        return {
            ok: true,
            isCorrect,
            attemptsOnThisQuestion,
            hintText,
            remediationActivityId,
            correctStreak: missionState.correctStreak,
            masteryThreshold: mission.mastery_threshold,
            justMastered: false,
            unlockedNextMissionId: null,
            questionCorrectStreak,
            questionMasteryState,
            activityMasteredQuestionCount,
            activityTotalQuestionCount,
            activityMasteryState,
        }
    }

    const newStreak = isCorrect ? missionState.correctStreak + 1 : 0
    const justMastered = isCorrect && newStreak >= mission.mastery_threshold

    await supabaseAdmin.from('mission_progress').upsert(
        {
            student_id: user.id,
            mission_id: mission.id,
            status: justMastered ? 'mastered' : 'unlocked',
            correct_streak: newStreak,
            mastered_at: justMastered ? new Date().toISOString() : null,
        },
        { onConflict: 'student_id,mission_id' }
    )

    let unlockedNextMissionId: string | null = null

    // Two independent unlock triggers (Phase 0, unchanged): mastery,
    // OR first-pass-complete — redefined above to read question_mastery
    // instead of the now-repurposed activity_mastery.correct_streak.
    const passedFirstPassCheck =
        !justMastered && isCorrect && (await hasCompletedFirstPass(supabaseAdmin, user.id, mission.id))

    if (justMastered || passedFirstPassCheck) {
        unlockedNextMissionId = await ensureNextMissionUnlocked(supabaseAdmin, user.id, mission.lesson_id, mission.order_index)
    }

    return {
        ok: true,
        isCorrect,
        attemptsOnThisQuestion,
        hintText,
        remediationActivityId,
        correctStreak: newStreak,
        masteryThreshold: mission.mastery_threshold,
        justMastered,
        unlockedNextMissionId,
        questionCorrectStreak,
        questionMasteryState,
        activityMasteredQuestionCount,
        activityTotalQuestionCount,
        activityMasteryState,
    }
}

/**
 * Upserts question_mastery for (student, question) — the real
 * 3-in-a-row streak now lives here, same increment/reset rule Phase 0
 * originally locked for activity_mastery. When shouldWrite is false
 * (mastered-mission replay), reads the existing row back without
 * writing, matching the non-destructive-replay rule.
 */
async function resolveQuestionMastery(
    supabaseAdmin: ReturnType<typeof createAdminClient>,
    studentId: string,
    questionId: string,
    isCorrect: boolean,
    hintWasVisible: boolean,
    shouldWrite: boolean
): Promise<{ correctStreak: number; state: 'new' | 'learning' | 'mastered' }> {
    const { data: existing } = await supabaseAdmin
        .from('question_mastery')
        .select('correct_streak, wrong_count, hint_uses, state')
        .eq('student_id', studentId)
        .eq('question_id', questionId)
        .maybeSingle()

    if (!shouldWrite) {
        return {
            correctStreak: existing?.correct_streak ?? 0,
            state: (existing?.state as any) ?? 'new',
        }
    }

    const nextStreak = isCorrect ? (existing?.correct_streak ?? 0) + 1 : 0
    const nextState: 'new' | 'learning' | 'mastered' =
        nextStreak >= QUESTION_MASTERY_STREAK_TARGET ? 'mastered' : nextStreak > 0 ? 'learning' : 'learning'

    const wasAlreadyMastered = existing?.state === 'mastered'

    await supabaseAdmin.from('question_mastery').upsert(
        {
            student_id: studentId,
            question_id: questionId,
            correct_streak: nextStreak,
            state: nextState,
            wrong_count: (existing?.wrong_count ?? 0) + (isCorrect ? 0 : 1),
            hint_uses: (existing?.hint_uses ?? 0) + (hintWasVisible ? 1 : 0),
            last_seen_at: new Date().toISOString(),
            // Only set the first time this question reaches mastered —
            // never overwritten on a later replay of an already-
            // mastered question (shouldWrite is false for those anyway,
            // but this guards a same-session double-submit edge case).
            mastered_at: nextState === 'mastered' && !wasAlreadyMastered ? new Date().toISOString() : undefined,
        },
        { onConflict: 'student_id,question_id' }
    )

    return { correctStreak: nextStreak, state: nextState }
}

/**
 * Recomputes the activity-level rollup from question_mastery — how
 * many of this activity's questions has this student mastered, out of
 * how many total. This IS the source of truth
 * get-mission-for-student.ts reads back later; nothing else computes
 * activity_mastery independently.
 */
async function resolveActivityMasteryRollup(
    supabaseAdmin: ReturnType<typeof createAdminClient>,
    studentId: string,
    activityId: string,
    shouldWrite: boolean
): Promise<{ masteredCount: number; totalCount: number; state: 'new' | 'learning' | 'mastered' }> {
    const { data: activityQuestions } = await supabaseAdmin
        .from('activity_questions')
        .select('id')
        .eq('activity_id', activityId)

    const questionIds = (activityQuestions ?? []).map((q) => q.id)
    const totalCount = questionIds.length

    const { data: masteryRows } = await supabaseAdmin
        .from('question_mastery')
        .select('question_id, state')
        .eq('student_id', studentId)
        .in('question_id', questionIds)

    const masteredCount = (masteryRows ?? []).filter((m) => m.state === 'mastered').length
    const state: 'new' | 'learning' | 'mastered' =
        totalCount > 0 && masteredCount === totalCount ? 'mastered' : masteredCount > 0 ? 'learning' : 'new'

    if (!shouldWrite) {
        return { masteredCount, totalCount, state }
    }

    const { data: existingActivityMastery } = await supabaseAdmin
        .from('activity_mastery')
        .select('state')
        .eq('student_id', studentId)
        .eq('activity_id', activityId)
        .maybeSingle()

    const wasAlreadyMastered = existingActivityMastery?.state === 'mastered'

    await supabaseAdmin.from('activity_mastery').upsert(
        {
            student_id: studentId,
            activity_id: activityId,
            // Repurposed field — count, not a streak. See file header.
            correct_streak: masteredCount,
            state,
            last_seen_at: new Date().toISOString(),
            mastered_at: state === 'mastered' && !wasAlreadyMastered ? new Date().toISOString() : undefined,
        },
        { onConflict: 'student_id,activity_id' }
    )

    return { masteredCount, totalCount, state }
}

/**
 * "Every question in every activity of this mission has been answered
 * correctly at least once" — redefined for migration 094 to read
 * question_mastery.correct_streak (see file header for why the old
 * activity_mastery-based check would now be wrong).
 */
async function hasCompletedFirstPass(
    supabaseAdmin: ReturnType<typeof createAdminClient>,
    studentId: string,
    missionId: string
): Promise<boolean> {
    const { data: activities } = await supabaseAdmin.from('activities').select('id').eq('mission_id', missionId)
    const activityIds = (activities ?? []).map((a) => a.id)
    if (activityIds.length === 0) return false

    const { data: questions } = await supabaseAdmin
        .from('activity_questions')
        .select('id')
        .in('activity_id', activityIds)
    const questionIds = (questions ?? []).map((q) => q.id)
    if (questionIds.length === 0) return false

    const { data: masteryRows } = await supabaseAdmin
        .from('question_mastery')
        .select('question_id, correct_streak')
        .eq('student_id', studentId)
        .in('question_id', questionIds)

    const attemptedAtLeastOnceCorrectly = new Set(
        (masteryRows ?? []).filter((m) => m.correct_streak >= 1).map((m) => m.question_id)
    )

    return questionIds.every((id) => attemptedAtLeastOnceCorrectly.has(id))
}

/**
 * Unchanged from submitActivityAttempt — unlocks the next mission in
 * order_index sequence within the same lesson, if one exists and isn't
 * already unlocked/mastered. Returns its id if a new unlock happened,
 * else null.
 */
async function ensureNextMissionUnlocked(
    supabaseAdmin: ReturnType<typeof createAdminClient>,
    studentId: string,
    lessonId: string,
    currentOrderIndex: number
): Promise<string | null> {
    const { data: nextMission } = await supabaseAdmin
        .from('missions')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('is_published', true)
        .gt('order_index', currentOrderIndex)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle()

    if (!nextMission) return null

    const { data: existingProgress } = await supabaseAdmin
        .from('mission_progress')
        .select('status')
        .eq('student_id', studentId)
        .eq('mission_id', nextMission.id)
        .maybeSingle()

    if (existingProgress) return null // already unlocked or further along

    await supabaseAdmin.from('mission_progress').insert({
        student_id: studentId,
        mission_id: nextMission.id,
        status: 'unlocked',
        correct_streak: 0,
    })

    return nextMission.id
}
