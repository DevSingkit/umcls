'use server'
// See lib/auth/AUTH_NOTES.md for why these checks exist.
//
// Creates (or resumes) a quiz_attempts row the moment a student opens
// the quiz-taking page, instead of only at final submission. Before this,
// gradeQuizSubmission inserted the attempt row at the very end, so
// started_at (default now()) landed at submission time regardless of how
// long the student had actually been on the page. That made
// prevent_response_after_expiry (DATABASE.md §7.8) a no-op — it compares
// now() against started_at + time_limit_minutes, and those were always
// seconds apart. started_at has to be set when the student begins, not
// when they finish, for that trigger (or any client-side countdown) to
// mean anything.

import { createClient } from '@/lib/supabase/server'
import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'

// Shape matches what TakeQuizForm needs to pre-fill a resumed attempt —
// one entry per question that already has a saved answer. Questions
// with no saved answer simply won't appear in this array.
type SavedAnswer = {
    questionId: string
    selectedOptionIds: string[]
    textResponse: string
}

export type StartQuizAttemptResult =
    | {
        ok: true
        attemptId: string
        startedAt: string
        timeLimitMinutes: number | null
        availableUntil: string | null
        allowLate: boolean
        savedAnswers: SavedAnswer[]
    }
    | { ok: false; error: string }

export async function startQuizAttempt(quizId: string): Promise<StartQuizAttemptResult> {
    await requireRole(['student'])
    const user = await getCurrentUser()
    const supabase = await createClient()

    const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('id, time_limit_minutes, available_until, allow_late')
        .eq('id', quizId)
        .single()

    if (quizError || !quiz) {
        return { ok: false, error: 'This quiz is not available right now.' }
    }

    const { data: existing } = await supabase
        .from('quiz_attempts')
        .select('id, started_at')
        .eq('quiz_id', quizId)
        .eq('student_id', user!.id)
        .eq('status', 'in_progress')
        .maybeSingle()

    if (existing) {
        // Resuming an already-started attempt is allowed even past the
        // deadline — same as how a resumed attempt past its timer limit
        // is allowed today. The actual cutoff happens where it already
        // did: prevent_response_after_expiry blocks further autosave
        // writes, and gradeQuizSubmission re-checks before finalizing.
        // Blocking the resume itself here would just show a confusing
        // "not available" error instead of letting the student see their
        // own in-progress work and whatever expiry message the write
        // path gives them.
        const savedAnswers = await loadSavedAnswers(supabase, existing.id)
        return {
            ok: true,
            attemptId: existing.id,
            startedAt: existing.started_at,
            timeLimitMinutes: quiz.time_limit_minutes,
            availableUntil: quiz.available_until,
            allowLate: quiz.allow_late,
            savedAnswers,
        }
    }

    // Gate for a genuinely NEW attempt only — mirrors submitAssignment's
    // due-date/allow_late gate (features/assignments/actions/submissions.ts).
    // Added 2026-08-03, migration 060.
    if (quiz.available_until && !quiz.allow_late && new Date() > new Date(quiz.available_until)) {
        return { ok: false, error: 'The deadline for this quiz has passed and it can no longer be started.' }
    }

    const { data: attempt, error: insertError } = await supabase
        .from('quiz_attempts')
        .insert({
            quiz_id: quizId,
            student_id: user!.id,
            status: 'in_progress',
        })
        .select('id, started_at')
        .single()

    if (insertError || !attempt) {
        const message = insertError?.message?.includes('Maximum quiz attempts reached')
            ? insertError.message
            : 'Could not start the quiz. Please try again.'
        return { ok: false, error: message }
    }

    return {
        ok: true,
        attemptId: attempt.id,
        startedAt: attempt.started_at,
        timeLimitMinutes: quiz.time_limit_minutes,
        availableUntil: quiz.available_until,
        allowLate: quiz.allow_late,
        // Brand new attempt — nothing autosaved yet.
        savedAnswers: [],
    }
}

// Loads any answers already autosaved for a resumed attempt, so the
// student sees their prior work instead of a blank form. Only reads
// this student's own responses via the RLS-scoped client (responses_select,
// 019_rls_policies.sql) — never touches is_correct.
async function loadSavedAnswers(
    supabase: Awaited<ReturnType<typeof createClient>>,
    attemptId: string
) {
    const { data: responses } = await supabase
        .from('quiz_responses')
        .select('question_id, selected_option_id, selected_option_ids, text_response')
        .eq('attempt_id', attemptId)

    return (responses ?? []).map((r) => ({
        questionId: r.question_id,
        selectedOptionIds: r.selected_option_ids ?? (r.selected_option_id ? [r.selected_option_id] : []),
        textResponse: r.text_response ?? '',
    }))
}