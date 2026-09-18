-- Removes passing_score from assignments, same product decision
-- already applied to quizzes (migration 071). Assignments keep
-- max_score — that still drives gradeSubmission's validation and the
-- gradebook's PS/WS math — only the pass/fail threshold goes.

ALTER TABLE public.assignments DROP COLUMN passing_score;
