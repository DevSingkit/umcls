'use server'
// features/missions/actions/submit-activity-attempt.ts
//
// Mirrors grade-quiz-submission.ts's core guarantee: the real answer
// key (activity_options.is_correct) is only ever read here, on the
// server, via the admin client — the student's browser never receives
// it, only the pass/fail result. Everything else is new, per
// HANDOFF.md's Day 4 note that this is "the biggest deviation" —
// there's no quiz_attempts-style session to start (attempt_events is
// fire-and-forget per activity, no equivalent of startQuizAttempt),
// no timer, no shuffle, no autosave. One activity, graded immediately,
// every time.
//
// State machine implemented here, confirmed explicitly before writing
// this file (not assumed):
//   - mission_progress.correct_streak resets to 0 on ANY wrong answer,
//     anywhere in the mission (strict "N in a row", not per-activity).
//   - Correct answers advance through activities in order; ActivityRunner
//     owns the cycling/looping, this file only reports whether the
//     answer was right and what streak/mastery state resulted.
//   - Hint appears once there have been 2 wrong attempts on THIS
//     specific activity since the student last got it right (or ever,
//     if never correct) — computed server-side from attempt_events,
//     never trusted from the client.
//   - Remediation surfaces once there have been 3+ such wrong attempts
//     AND some other activity has remediates_activity_id pointing at
//     this one; otherwise the student just retries.
//
// Bootstrapping-rule consistency: this file calls
// getMissionsForStudent (the exact same function get-mission-for-student.ts
// exports for Day 3's path view) to determine whether this mission is
// currently accessible, rather than re-deriving "first published
// mission unlocked by default" independently. This is the concrete
// fix for the gap flagged at the end of Day 3: the read path and the
// (first) write path now share one implementation, so they cannot
// silently disagree about what a fresh student's first mission is.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'
import { getMissionsForStudent } from '@/features/missions/actions/get-mission-for-student'

type SubmitActivityAttemptInput = {
    activityId: string
    selectedOptionId: string
    // Whether the hint was already visible in the UI when this answer
    // was submitted — recorded on the attempt_events row for Day 5's
    // needs-attention analytics (e.g. "hint shown but still wrong a
    // lot"). Not used for any grading/state-machine decision here;
    // those are always recomputed server-side from attempt_events.
    hintWasVisible: boolean
}

export type SubmitActivityAttemptResult =
    | {
          ok: true
          isCorrect: boolean
          // Total attempts on THIS specific activity since the student
          // last answered it correctly (or ever, if never correct),
          // including this one.
          attemptsOnThisActivity: number
          hintText: string | null
          remediationActivityId: string | null
          correctStreak: number
          masteryThreshold: number
          justMastered: boolean
          unlockedNextMissionId: string | null
      }
    | { ok: false; error: string }

// Finds the next published mission after currentOrderIndex in this
// lesson and unlocks it for this student — but never downgrades a
// mission that's already unlocked or mastered. Idempotent: safe to
// call on every mastered-mission replay, not just the moment mastery
// first happens, specifically so a mission added by the teacher AFTER
// a student already mastered the one before it still gets unlocked
// the next time that student revisits it. Returns the unlocked
// mission's id, or null if there was nothing to unlock (no next
// mission yet, or it's already unlocked/mastered).
async function ensureNextMissionUnlocked({
    supabase,
    supabaseAdmin,
    lessonId,
    currentOrderIndex,
    studentId,
}: {
    supabase: Awaited<ReturnType<typeof createClient>>
    supabaseAdmin: ReturnType<typeof createAdminClient>
    lessonId: string
    currentOrderIndex: number
    studentId: string
}): Promise<string | null> {
    const { data: nextMission } = await supabase
        .from('missions')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('is_published', true)
        .gt('order_index', currentOrderIndex)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle()

    if (!nextMission) return null

    const { data: existingNextProgress } = await supabaseAdmin
        .from('mission_progress')
        .select('status')
        .eq('mission_id', nextMission.id)
        .eq('student_id', studentId)
        .maybeSingle()

    const alreadyAheadOrDone =
        existingNextProgress?.status === 'unlocked' || existingNextProgress?.status === 'mastered'

    if (alreadyAheadOrDone) return null

    const { error: unlockError } = await supabaseAdmin.from('mission_progress').upsert(
        {
            mission_id: nextMission.id,
            student_id: studentId,
            status: 'unlocked',
            correct_streak: existingNextProgress ? undefined : 0,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'mission_id,student_id' }
    )

    return unlockError ? null : nextMission.id
}

export async function submitActivityAttempt(
    input: SubmitActivityAttemptInput
): Promise<SubmitActivityAttemptResult> {
    await requireRole(['student'])
    const user = await getCurrentUser()
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const { activityId, selectedOptionId, hintWasVisible } = input

    if (!user) {
        return { ok: false, error: 'Not signed in.' }
    }

    // Normal, RLS-scoped client for the ownership/access check — same
    // split as grade-quiz-submission.ts (student-scoped client for
    // "am I allowed to be here," admin client only for the answer key).
    const { data: activity, error: activityError } = await supabase
        .from('activities')
        .select(
            'id, mission_id, hint_text, missions!inner(id, lesson_id, is_published, mastery_threshold, order_index)'
        )
        .eq('id', activityId)
        .single()

    if (activityError || !activity) {
        return { ok: false, error: 'Activity not found or not accessible.' }
    }

    const mission = (activity as any).missions
    if (!mission.is_published) {
        return { ok: false, error: 'This mission is not available.' }
    }

    // Confirm the mission is actually unlocked (or already mastered —
    // reviewing a mastered mission is allowed, see below) for this
    // student, using the SAME function the path view uses, so the two
    // can't drift apart.
    const missionsInLesson = await getMissionsForStudent(mission.lesson_id)
    const missionState = missionsInLesson.find((m) => m.id === mission.id)

    if (!missionState || missionState.status === 'locked') {
        return { ok: false, error: 'This mission is locked.' }
    }

    const isReviewOfMasteredMission = missionState.status === 'mastered'

    // How many attempts has this student made on THIS activity since
    // they last got it right (or ever)? Computed from attempt_events,
    // never trusted from the client. Pull recent rows newest-first and
    // count the leading run of wrong answers.
    const { data: recentEvents, error: recentEventsError } = await supabase
        .from('attempt_events')
        .select('is_correct, responded_at')
        .eq('activity_id', activityId)
        .eq('student_id', user.id)
        .order('responded_at', { ascending: false })
        .limit(10)

    if (recentEventsError) {
        return { ok: false, error: 'Could not load attempt history.' }
    }

    let consecutiveWrongSoFar = 0
    for (const event of recentEvents ?? []) {
        if (event.is_correct) break
        consecutiveWrongSoFar += 1
    }

    // Only the admin client is allowed to see is_correct — same
    // guarantee as grade-quiz-submission.ts reading answer_options.
    const { data: options, error: optionsError } = await supabaseAdmin
        .from('activity_options')
        .select('id, is_correct')
        .eq('activity_id', activityId)

    if (optionsError) {
        return { ok: false, error: 'Could not grade this activity.' }
    }

    const selectedOption = (options ?? []).find((o) => o.id === selectedOptionId)
    if (!selectedOption) {
        return { ok: false, error: 'Invalid answer option.' }
    }

    const isCorrect = selectedOption.is_correct
    const attemptsOnThisActivity = consecutiveWrongSoFar + 1

    // Total attempt_number for this row — a straightforward running
    // count of every attempt ever made on this activity by this
    // student, distinct from the "consecutive wrong" count above,
    // which only drives hint/remediation and resets on any correct
    // answer.
    const { count: totalPriorAttempts } = await supabase
        .from('attempt_events')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', activityId)
        .eq('student_id', user.id)

    const { error: insertError } = await supabaseAdmin.from('attempt_events').insert({
        activity_id: activityId,
        student_id: user.id,
        attempt_number: (totalPriorAttempts ?? 0) + 1,
        is_correct: isCorrect,
        hint_shown: hintWasVisible,
        selected_option_id: selectedOptionId,
    })

    if (insertError) {
        return { ok: false, error: 'Could not save your attempt.' }
    }

    let hintText: string | null = null
    let remediationActivityId: string | null = null

    if (!isCorrect) {
        if (attemptsOnThisActivity >= 2) {
            hintText = activity.hint_text
        }
        if (attemptsOnThisActivity >= 3) {
            const { data: remediation } = await supabase
                .from('activities')
                .select('id')
                .eq('remediates_activity_id', activityId)
                .limit(1)
                .maybeSingle()
            remediationActivityId = remediation?.id ?? null
        }
    }

    // Reviewing an already-mastered mission never touches this
    // mission's own mission_progress row (streak/mastered_at) — a
    // casual replay must never regress that. BUT it still needs to
    // check whether the NEXT mission should be unlocked: if a teacher
    // adds a new mission after a student already mastered this one,
    // the original mastery moment had nothing to unlock yet, and
    // nothing else ever re-runs that check. Without this, a student
    // who mastered mission N before mission N+1 existed would be
    // permanently stuck even after N+1 is published — confirmed bug,
    // not a hypothetical: replaying N short-circuited here before ever
    // reaching the unlock logic below. This call heals that on every
    // replay, idempotently — ensureNextMissionUnlocked itself already
    // no-ops if the next mission is already unlocked/mastered.
    if (isReviewOfMasteredMission) {
        const unlockedNextMissionId = await ensureNextMissionUnlocked({
            supabase,
            supabaseAdmin,
            lessonId: mission.lesson_id,
            currentOrderIndex: mission.order_index,
            studentId: user.id,
        })

        return {
            ok: true,
            isCorrect,
            attemptsOnThisActivity,
            hintText,
            remediationActivityId,
            correctStreak: missionState.correctStreak,
            masteryThreshold: mission.mastery_threshold,
            justMastered: false,
            unlockedNextMissionId,
        }
    }

    const newStreak = isCorrect ? missionState.correctStreak + 1 : 0
    const justMastered = isCorrect && newStreak >= mission.mastery_threshold

    // mission_progress has no direct write policy for students — this
    // write happens here, via the admin client, per HANDOFF.md's Day 1
    // note ("writes happen server-side via service-role in Phase 2's
    // mastery-check action"). This IS that action.
    const { error: progressError } = await supabaseAdmin.from('mission_progress').upsert(
        {
            mission_id: mission.id,
            student_id: user.id,
            status: justMastered ? 'mastered' : 'unlocked',
            correct_streak: newStreak,
            mastered_at: justMastered ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'mission_id,student_id' }
    )

    if (progressError) {
        return { ok: false, error: 'Could not save your progress.' }
    }

    let unlockedNextMissionId: string | null = null

    if (justMastered) {
        unlockedNextMissionId = await ensureNextMissionUnlocked({
            supabase,
            supabaseAdmin,
            lessonId: mission.lesson_id,
            currentOrderIndex: mission.order_index,
            studentId: user.id,
        })
    }

    return {
        ok: true,
        isCorrect,
        attemptsOnThisActivity,
        hintText,
        remediationActivityId,
        correctStreak: newStreak,
        masteryThreshold: mission.mastery_threshold,
        justMastered,
        unlockedNextMissionId,
    }
}
