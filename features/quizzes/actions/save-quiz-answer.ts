'use server'
// See lib/auth/AUTH_NOTES.md for why these checks exist.
//
// Autosaves a single answer as the student works through the quiz, so a
// dropped connection or a closed tab doesn't lose their progress. This
// uses the normal user-scoped client (not admin) on purpose — RLS
// (responses_insert / responses_update, 019_rls_policies.sql) already
// restricts writes to the student's own attempt_id while it's still
// in_progress, and that's the exact guarantee we want here: a student
// can only autosave answers to their own, still-open attempt.
//
// This never touches is_correct or reveals the answer key — it only
// writes what the student selected/typed. Grading still happens once,
// at final submission, in grade-quiz-submission.ts.
//
// trg_prevent_late_response (DATABASE.md §7.8) still blocks any write
// here past the timer expiry or once the attempt is no longer
// in_progress, so autosave inherits that protection automatically —
// nothing extra to enforce client-side beyond disabling the inputs.

import { createClient } from '@/lib/supabase/server'
import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'

type SaveAnswerInput = {
    attemptId: string
    questionId: string
    questionType: string
    selectedOptionIds: string[]
    textResponse: string
}

export type SaveQuizAnswerResult =
    | { ok: true; savedAt: string }
    | { ok: false; error: string }

export async function saveQuizAnswer(input: SaveAnswerInput): Promise<SaveQuizAnswerResult> {
    await requireRole(['student'])
    const user = await getCurrentUser()
    const supabase = await createClient()

    const { attemptId, questionId, questionType, selectedOptionIds, textResponse } = input

    // Confirm the attempt actually belongs to this student before doing
    // anything else. RLS enforces this too, but checking here lets us
    // return a clear message instead of a generic failed-upsert below.
    const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('id, student_id, status')
        .eq('id', attemptId)
        .single()

    if (attemptError || !attempt || attempt.student_id !== user?.id) {
        return { ok: false, error: 'Attempt not found or not accessible.' }
    }

    if (attempt.status !== 'in_progress') {
        // Not an error the student needs to see mid-quiz — this just
        // means the quiz already closed (timer, availability window, or
        // already submitted). The UI should already be locked by then.
        return { ok: false, error: 'This attempt is no longer in progress.' }
    }

    const isChecklist = questionType === 'checklist'
    const isShortAnswer = questionType === 'short_answer'

    // Nothing to save yet (student cleared their answer) — skip the
    // write rather than inserting an empty/invalid row, since
    // responses_has_answer (009_attempts_responses.sql) rejects a row
    // with no answer modality set at all.
    const hasAnswer = isShortAnswer
        ? textResponse.trim().length > 0
        : selectedOptionIds.length > 0

    if (!hasAnswer) {
        // If a row already exists from an earlier autosave (student
        // answered, then cleared it), remove it so a stale answer isn't
        // left behind. RLS (responses_update policy scope) doesn't cover
        // delete, but the student's own in_progress attempt is safe to
        // clean up here via a plain delete under the same client.
        await supabase
            .from('quiz_responses')
            .delete()
            .eq('attempt_id', attemptId)
            .eq('question_id', questionId)

        return { ok: true, savedAt: new Date().toISOString() }
    }

    const row = {
        attempt_id: attemptId,
        question_id: questionId,
        selected_option_id: isShortAnswer || isChecklist ? null : selectedOptionIds[0] ?? null,
        selected_option_ids: isChecklist ? selectedOptionIds : null,
        text_response: isShortAnswer ? textResponse : null,
        // Autosave never grades. is_correct/points_awarded stay null
        // until final submission — grade-quiz-submission.ts overwrites
        // this row with the real result at that point.
        is_correct: null,
        points_awarded: null,
    }

    const { error: upsertError } = await supabase
        .from('quiz_responses')
        .upsert(row, { onConflict: 'attempt_id,question_id' })

    if (upsertError) {
        return { ok: false, error: 'Could not save your answer.' }
    }

    return { ok: true, savedAt: new Date().toISOString() }
}
