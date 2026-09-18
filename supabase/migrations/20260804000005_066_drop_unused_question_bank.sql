-- Drops question_bank, confirmed unused via three independent sources
-- (2026-08-04), not just a doc claim this time — DATABASE.md had
-- actually asserted the opposite ("still used by manual question
-- authoring, confirmed live"), which turned out to be wrong:
--
--   1. Live row count: 0 rows in question_bank, 0 rows in questions
--      with a non-null question_bank_id.
--   2. Code check: create-quiz.ts's addQuestion/updateQuestion (the
--      only real question-creation path in the app) insert directly
--      into `questions` and never set question_bank_id at all.
--   3. tests/security/rls-audit.ts's own PH8-002 scope note lists
--      question_bank among tables "with no V1 feature writing to it
--      yet" and deliberately excludes it from RLS testing for that
--      reason — written independently, corroborates the other two.
--
-- questions.question_bank_id is a nullable FK into this table and has
-- to go first — dropping the column removes its FK constraint
-- cleanly, rather than dropping question_bank with CASCADE and leaving
-- a dangling, permanently-null column behind on `questions`.
--
-- question_bank.source_lesson_id (a FK into lessons) goes away
-- automatically with the table — no separate handling needed since
-- lessons isn't the dependent side of that relationship.

alter table public.questions drop column if exists question_bank_id;

drop table if exists public.question_bank;
