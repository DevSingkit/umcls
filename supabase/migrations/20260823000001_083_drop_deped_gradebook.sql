-- 20260823000001_083_drop_deped_gradebook.sql
--
-- Removes the manual, DepEd-shaped gradebook system entirely, per
-- adviser/professor feedback: this is being rebuilt to match real
-- Google Classroom's grading model, which has no manual "add a
-- gradebook column" concept and no weighted WW/PT/QA computation.
-- Grades now come only from real assignments/quizzes
-- (assignment_submissions.score / quiz_attempts.score against their
-- own max_score/points), which were already raw-points-shaped as of
-- migration 073 — this migration only removes the now-dead layer on
-- top of that, it does not touch assignments/assignment_submissions/
-- quizzes/quiz_attempts at all.
--
-- Confirmed before writing this migration (2026-08-23, app-layer
-- review of gradebook-items.ts, GradebookGrid.tsx,
-- GradesVisibilityToggle.tsx, get-my-final-grade.ts, gradebook.ts,
-- admin-grades.ts): every one of gradebook_items/gradebook_scores/
-- subject_weight_profiles/courses.grades_visible_to_students has
-- exactly one reader/writer each, and all of those app-layer files
-- are being deleted or rewritten in the same pass as this migration.
-- Nothing else in the codebase touches these four things.
--
-- Also drops any student-visible "overall grade" concept outright —
-- not just the DepEd weighting. Real Classroom's own "No overall
-- grade" mode (one of its three actual grading-display settings) is
-- the target here: a student sees only their own per-item scores,
-- never a computed total. There is deliberately no replacement
-- column/table for this — it's not stored anywhere, because nothing
-- computes it anymore.
--
-- Scores/history are NOT lost by this migration — every real score a
-- student has ever earned still lives in assignment_submissions.score
-- and quiz_attempts.score, completely untouched. Only the manual
-- gradebook layer built on top (columns a teacher typed in by hand,
-- DepEd component tagging, subject weight percentages) goes away.

-- Scores first — gradebook_scores.gradebook_item_id FKs to
-- gradebook_items, so it must go before its parent table.
DROP TABLE IF EXISTS public.gradebook_scores;
DROP TABLE IF EXISTS public.gradebook_items;

-- WW/PT/QA weighting percentages — confirmed unused already by
-- migration 077's own comment ("no longer read anywhere"), and now
-- has zero readers at all with gradebook_items/get-my-final-grade.ts
-- both gone.
DROP TABLE IF EXISTS public.subject_weight_profiles;

-- Only droppable now that gradebook_items (its sole column user) is
-- gone. migration 077 already dropped this same enum's use on
-- quizzes.grading_component / assignments.grading_component; this
-- was the enum's last remaining reference.
DROP TYPE IF EXISTS grading_component_type;

-- Backed a toggle (GradesVisibilityToggle.tsx) whose entire job was
-- hiding/showing the Final Grade this migration removes. Nothing left
-- to hide once there's no aggregate to show in the first place.
ALTER TABLE public.courses DROP COLUMN IF EXISTS grades_visible_to_students;
