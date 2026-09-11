-- 20260708_033_quiz_show_results_after.sql
-- Adds the teacher-facing control for when a student sees per-question
-- correctness after submitting a quiz. Referenced by PH4-006
-- (tasks.md) as show_results_after = 'grading', but that value only
-- makes sense once the more general setting exists — this migration
-- adds it.
--
-- Three values:
--   'immediately'    — student sees isCorrect on each auto-graded
--                       question as soon as they submit (default —
--                       matches current behavior before this change).
--   'after_grading'  — isCorrect is withheld until the whole attempt
--                       reaches status = 'graded'. For a quiz with no
--                       short_answer questions this is functionally
--                       the same as 'immediately' (grading is instant).
--                       For a quiz with short_answer questions, this
--                       delays reveal until the teacher finishes manual
--                       grading (PH4-006).
--   'never'          — student only ever sees score/pass-fail, never
--                       which individual questions were right or wrong.
--
-- Defaulting existing rows to 'immediately' preserves current behavior
-- for quizzes created before this migration.

alter table quizzes
    add column show_results_after text not null default 'immediately'
        check (show_results_after in ('immediately', 'after_grading', 'never'));
