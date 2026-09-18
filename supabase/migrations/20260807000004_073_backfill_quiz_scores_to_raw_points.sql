-- One-time backfill after migration 071 (quiz_attempts.score changed
-- meaning from a 0-100 percentage to a raw point total). Any attempt
-- graded before 071 shipped still has its old percentage-style number
-- sitting in `score`, which is now wrong under the new meaning.
--
-- Recomputes score as the true sum of points_awarded across that
-- attempt's quiz_responses — the exact same computation
-- computeAttemptTotal() and gradeQuizSubmission() already do for new
-- attempts, so this produces the correct number whether the attempt
-- predates 071 or not. Safe to run unconditionally for that reason.
--
-- Only touches the LATEST graded attempt per (student, quiz) pair —
-- per product decision, if a student was allowed multiple attempts,
-- only the most recent one is ever "the truth" for grading. Earlier
-- attempts on the same quiz are left untouched; they don't feed into
-- any current grade and rewriting them would just be noise on
-- superseded history.
--
-- quiz_responses rows are kept permanently as history (no delete path
-- exists), so this recomputation is exact, not an estimate.

WITH latest_attempts AS (
  SELECT DISTINCT ON (quiz_id, student_id)
    id AS attempt_id
  FROM quiz_attempts
  WHERE status = 'graded'
  ORDER BY quiz_id, student_id, submitted_at DESC NULLS LAST
),
recomputed AS (
  SELECT
    la.attempt_id,
    COALESCE(SUM(qr.points_awarded), 0) AS raw_total
  FROM latest_attempts la
  JOIN quiz_responses qr ON qr.attempt_id = la.attempt_id
  GROUP BY la.attempt_id
)
UPDATE quiz_attempts qa
SET score = recomputed.raw_total
FROM recomputed
WHERE qa.id = recomputed.attempt_id;
