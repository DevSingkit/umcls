-- Drops grading_component from quizzes and assignments. Both were used
-- by the old auto-computed DepEd summary (computeDepEdGradesForCourse,
-- getDepEdGradesForCourse in gradebook.ts), which the manual, teacher-
-- built gradebook replaced entirely (migration 072). A gradebook
-- column now carries its own component when created, whether or not
-- it's linked to a real assignment/quiz — the source item's own
-- component setting is no longer read anywhere. Confirmed unused
-- before dropping.

ALTER TABLE public.quizzes DROP COLUMN grading_component;
ALTER TABLE public.assignments DROP COLUMN grading_component;
