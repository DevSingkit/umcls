-- Removes pass/fail from quizzes entirely, per product decision:
-- students now just see their raw score (e.g. "8/10"), no pass/fail
-- label, no teacher-set passing threshold.
--
-- quiz_attempts.score changes MEANING here too, from a 0-100 percentage
-- to a raw point total (sum of points_awarded across the attempt's
-- responses). This migration does not need to rewrite existing rows'
-- score values retroactively — see the note in grade-quiz-submission.ts
-- and grade-short-answer.ts, this only takes effect for attempts graded
-- after the app code deploys. If old percentage-based scores need to be
-- reinterpreted as points for historical attempts, that's a separate,
-- deliberate backfill decision, not folded silently into this migration.

ALTER TABLE public.quiz_attempts DROP COLUMN is_passing;
ALTER TABLE public.quizzes DROP COLUMN passing_score;
