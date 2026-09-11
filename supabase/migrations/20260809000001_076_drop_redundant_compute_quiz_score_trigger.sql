-- Drops trg_compute_quiz_score and its function, compute_quiz_score().
--
-- This trigger duplicated what gradeQuizSubmission (application code)
-- already computes on submit, running a second, independent scoring
-- calculation directly in the database, unknown to whoever was
-- maintaining the TypeScript side. Because it ran as part of the same
-- UPDATE gradeQuizSubmission issues, it silently overwrote
-- gradeQuizSubmission's own score with its own separately-computed
-- number every time — the two happened to produce similar-shaped
-- numbers before (both were 0-100 percentages), so this went
-- unnoticed. It started throwing outright once quiz scoring moved to
-- raw points and passing_score/is_passing were dropped (migration
-- 071), since this trigger still referenced both.
--
-- Rather than fix the trigger to match the new system, it's removed
-- entirely — gradeQuizSubmission (and computeAttemptTotal in
-- grade-short-answer.ts, for the short-answer path) is now the single,
-- sole place quiz scoring happens. One implementation, not two that
-- can silently drift apart again.

DROP TRIGGER IF EXISTS trg_compute_quiz_score ON public.quiz_attempts;
DROP FUNCTION IF EXISTS public.compute_quiz_score();
