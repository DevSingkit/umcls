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
//
// PHASE 2 ADDITION (ADAPTIVE-ENGINE-PLAN.md, 2026-08-28): this file
// now also upserts `activity_mastery`, a THIRD write alongside
// attempt_events and mission_progress, on every attempt. This is a
// genuinely separate streak from mission_progress.correct_streak —
// mission_progress tracks "N correct in a row anywhere in the
// mission" (see note above), while activity_mastery tracks "N correct
// in a row on THIS specific activity". They are computed independently
// and can disagree (e.g. an activity can individually be mastered
// while its mission overall is not, and vice versa isn't possible
// since mission mastery requires every activity mastered — but the
// two streaks themselves are never the same counter).
//
// Mastered-mission-review protection (confirmed with user before
// implementing, matching Phase 3.6's not-yet-built plan for the same
// behavior): when isReviewOfMasteredMission is true, the write half of
// resolveActivityMastery is skipped, same as the existing
// mission_progress skip below. A casual replay of an already-mastered
// mission must not be able to demote an activity's mastery state
// (e.g. a careless wrong answer during replay dropping correct_streak
// back to 0) any more than it can demote the mission's own state.
// attempt_events still logs the replay attempt as normal either way.
//
// PHASE 3 ADDITION: the result now also returns activityCorrectStreak/
// activityMasteryState — the per-ACTIVITY streak, distinct from the
// existing mission-wide correctStreak field. ActivityRunner.tsx's new
// in-session requeue queue needs this to know when one specific
// activity has hit its own 3-in-a-row and can leave the active
// rotation, independent of whether the whole mission is mastered yet.
//
// PHASE 2.5 ADDITION (decided while starting Phase 3.5, confirmed with
// user, implemented here since it's a write-path concern): the next
// mission now unlocks via EITHER of two independent triggers — the
// original mastery-based one (justMastered), or a new "first pass
// complete" one (student has answered every activity in the current
// mission CORRECTLY at least once — matched against Duolingo's
// requeue-until-correct precedent, not just "attempted"). The current
// mission stays open for replay either way; this only changes when the
// NEXT one becomes available. A student can now legitimately be
// actively working two missions at once — see hasCompletedFirstPass
// below.

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
    // PHASE 2: also used as the neutral hint_uses increment signal on
    // activity_mastery (Phase 0's "hint usage: neutral — logged only"
    // decision) — same source of truth, not a separate flag.
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
          // PHASE 3 ADDITION: this activity's OWN streak/state from
          // activity_mastery, distinct from `correctStreak` above
          // (which is the mission-wide "N in a row anywhere" counter).
          // ActivityRunner.tsx's in-session requeue queue needs this
          // to know when THIS SPECIFIC activity has hit its own
          // 3-in-a-row and can be dropped from the active rotation,
          // vs. still needing to come back around. During a
          // mastered-mission replay this reflects the activity's real
          // (unwritten-by-this-attempt) current state, not a live
          // update — see resolveActivityMastery's shouldWrite flag.
          activityCorrectStreak: number
          activityMasteryState: 'new' | 'learning' | 'mastered'
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

// PHASE 2.5 ADDITION (ADAPTIVE-ENGINE-LOG.md, 2026-08-28 — decided
// while starting Phase 3.5, implemented here since it belongs in the
// write path, not the dashboard): a SECOND, independent trigger for
// unlocking the next mission, alongside the existing mastery-based one
// above. Confirmed with user: the next mission should unlock once the
// student has completed a "first pass" of the CURRENT mission, even if
// the current mission hasn't reached mastered yet. The current mission
// stays open for replay afterward regardless; this only affects when
// the NEXT one becomes available. The two triggers (mastery-based,
// first-pass-based) are independent and idempotent — whichever fires
// first wins, neither downgrades the other, both ultimately call the
// same ensureNextMissionUnlocked above.
//
// "First pass complete" = every activity in the mission has been
// answered CORRECTLY at least once — not merely attempted. This
// definition was chosen deliberately, checked against precedent rather
// than guessed: Duolingo's lesson-completion model never lets a wrong
// answer count as "done" with a question — a miss gets requeued and
// the student must eventually answer correctly before that lesson
// clears. The original draft of this function ("attempted at least
// once, correctness doesn't matter") would have let a pure wrong guess
// unlock the next mission, which doesn't match that precedent and
// isn't the right signal for "this student is ready to move on."
//
// Implementation: activity_mastery.correct_streak already resets to 0
// on any wrong answer (Phase 2's resolveActivityMastery), so
// "correct_streak >= 1" is exactly "this activity's most recent answer
// was correct" — an existing field, no new column needed. Safe to
// recompute on every attempt since ensureNextMissionUnlocked only ever
// upgrades mission_progress, never re-locks it — a later wrong answer
// dropping an activity's streak back to 0 cannot un-unlock mission N+1
// once it's already been granted.
async function hasCompletedFirstPass({
    supabaseAdmin,
    missionId,
    studentId,
}: {
    supabaseAdmin: ReturnType<typeof createAdminClient>
    missionId: string
    studentId: string
}): Promise<boolean> {
    const { data: missionActivities, error: activitiesError } = await supabaseAdmin
        .from('activities')
        .select('id')
        .eq('mission_id', missionId)

    if (activitiesError || !missionActivities || missionActivities.length === 0) {
        // No activities (shouldn't happen — createMissionWithFirstActivity
        // never leaves a mission empty) or a read failure. Either way,
        // false is the safe default: better to leave the next mission
        // locked a bit longer than to unlock it incorrectly.
        return false
    }

    const activityIds = missionActivities.map((a) => a.id)

    const { data: masteryRows, error: masteryError } = await supabaseAdmin
        .from('activity_mastery')
        .select('activity_id, correct_streak')
        .eq('student_id', studentId)
        .in('activity_id', activityIds)

    if (masteryError) {
        return false
    }

    const correctlyAnsweredIds = new Set(
        (masteryRows ?? []).filter((m) => m.correct_streak >= 1).map((m) => m.activity_id)
    )
    return activityIds.every((id) => correctlyAnsweredIds.has(id))
}

// PHASE 2: per-activity mastery upsert, implementing Phase 0's locked
// streak rules exactly (ADAPTIVE-ENGINE-PLAN.md Phase 2 section):
//   ON correct: correct_streak += 1, state = streak >= 3 ? mastered :
//     learning, last_seen_at = now().
//   ON wrong: correct_streak = 0, wrong_count += 1, state = 'learning'
//     (even if previously mastered), last_seen_at = now().
//   ON hint shown: hint_uses += 1, neutral — never affects streak/state.
//
// mastered_at deviation from the plan's literal pseudocode, flagged
// explicitly rather than assumed silently: the plan's draft formula
// ("mastered_at = state === 'mastered' ? now() : null") would, taken
// literally, overwrite mastered_at back to null on every correct
// answer that doesn't happen to be the exact transition moment, and
// would never touch it on a wrong answer. That contradicts the same
// line's own parenthetical ("set once, on the transition"). Read the
// comment as the actual intent: mastered_at is set the FIRST time
// correct_streak reaches the threshold, then preserved as a historical
// fact after that — not cleared by a later wrong answer dropping the
// activity back to 'learning', and not re-stamped by further correct
// answers once already mastered. This matters for Phase 6's ML
// features later (e.g. "was this ever mastered before regressing" is
// a different, useful signal from "is it mastered right now"). Worth
// confirming this reading is what's wanted the first time real data
// is reviewed — noted in the log for that reason.
type ActivityMasteryResolution = {
    correctStreak: number
    state: 'new' | 'learning' | 'mastered'
}

// shouldWrite=false (mastered-mission replay) reads the row as-is and
// changes nothing — this is what makes replay non-destructive to
// activity_mastery, matching the same protection already applied to
// mission_progress below. Either way, the caller gets back an accurate
// current {correctStreak, state} to hand to the client, since
// ActivityRunner.tsx's queue needs this number regardless of whether
// it was just written or just read.
async function resolveActivityMastery({
    supabaseAdmin,
    studentId,
    activityId,
    isCorrect,
    hintWasVisible,
    shouldWrite,
}: {
    supabaseAdmin: ReturnType<typeof createAdminClient>
    studentId: string
    activityId: string
    isCorrect: boolean
    hintWasVisible: boolean
    shouldWrite: boolean
}): Promise<ActivityMasteryResolution> {
    const { data: existing, error: existingError } = await supabaseAdmin
        .from('activity_mastery')
        .select('correct_streak, wrong_count, hint_uses, mastered_at, state')
        .eq('student_id', studentId)
        .eq('activity_id', activityId)
        .maybeSingle()

    if (existingError) {
        // Non-fatal: attempt_events (the source of truth) and
        // mission_progress have already been written by this point.
        // activity_mastery is a derived convenience table for Phase
        // 3+/6, so a failure here is logged, not surfaced as a failed
        // attempt to the student — worst case the client falls back to
        // treating this activity as fresh (streak 0), which just means
        // it stays in the requeue rotation a little longer than ideal,
        // not a data-loss or grading problem.
        console.error('resolveActivityMastery: failed to read existing row', existingError)
    }

    if (!shouldWrite) {
        return {
            correctStreak: existing?.correct_streak ?? 0,
            state: (existing?.state as ActivityMasteryResolution['state']) ?? 'new',
        }
    }

    const priorStreak = existing?.correct_streak ?? 0
    const priorWrongCount = existing?.wrong_count ?? 0
    const priorHintUses = existing?.hint_uses ?? 0
    const priorMasteredAt = existing?.mastered_at ?? null

    const newStreak = isCorrect ? priorStreak + 1 : 0
    const newWrongCount = isCorrect ? priorWrongCount : priorWrongCount + 1
    const newHintUses = hintWasVisible ? priorHintUses + 1 : priorHintUses
    const newState: ActivityMasteryResolution['state'] = newStreak >= 3 ? 'mastered' : 'learning'

    // Set once, on the transition into mastered — preserved afterward
    // regardless of later correct or wrong answers (see note above).
    const justTransitionedToMastered = newState === 'mastered' && priorMasteredAt === null
    const newMasteredAt = justTransitionedToMastered ? new Date().toISOString() : priorMasteredAt

    const { error: upsertError } = await supabaseAdmin.from('activity_mastery').upsert(
        {
            student_id: studentId,
            activity_id: activityId,
            state: newState,
            correct_streak: newStreak,
            wrong_count: newWrongCount,
            hint_uses: newHintUses,
            last_seen_at: new Date().toISOString(),
            mastered_at: newMasteredAt,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,activity_id' }
    )

    if (upsertError) {
        console.error('resolveActivityMastery: failed to write activity_mastery', upsertError)
    }

    return { correctStreak: newStreak, state: newState }
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

    // PHASE 2/3: activity_mastery is read-or-written here either way —
    // write is skipped (shouldWrite=false) during a mastered-mission
    // replay, matching the same protection applied to mission_progress
    // just below, but the current {correctStreak, state} is still
    // returned so ActivityRunner.tsx's queue logic always has an
    // accurate number to work with, replay or not.
    const activityMastery = await resolveActivityMastery({
        supabaseAdmin,
        studentId: user.id,
        activityId,
        isCorrect,
        hintWasVisible,
        shouldWrite: !isReviewOfMasteredMission,
    })

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
            activityCorrectStreak: activityMastery.correctStreak,
            activityMasteryState: activityMastery.state,
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

    // PHASE 2.5: two independent unlock triggers now, not one. Mastery
    // trigger checked first since it's the cheaper/already-known
    // condition; first-pass trigger only queried if the mastery one
    // didn't already unlock something, to avoid a redundant read on
    // the common "already unlocked via mastery" path. Both ultimately
    // call the same ensureNextMissionUnlocked, so whichever condition
    // is true first wins — neither can downgrade the other.
    if (justMastered) {
        unlockedNextMissionId = await ensureNextMissionUnlocked({
            supabase,
            supabaseAdmin,
            lessonId: mission.lesson_id,
            currentOrderIndex: mission.order_index,
            studentId: user.id,
        })
    }

    if (!unlockedNextMissionId) {
        const firstPassComplete = await hasCompletedFirstPass({
            supabaseAdmin,
            missionId: mission.id,
            studentId: user.id,
        })

        if (firstPassComplete) {
            unlockedNextMissionId = await ensureNextMissionUnlocked({
                supabase,
                supabaseAdmin,
                lessonId: mission.lesson_id,
                currentOrderIndex: mission.order_index,
                studentId: user.id,
            })
        }
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
        activityCorrectStreak: activityMastery.correctStreak,
        activityMasteryState: activityMastery.state,
    }
}
