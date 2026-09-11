-- 20260714000005_043_reteach_lessons_real_unique_constraint.sql
-- Fixes: Supabase JS's .upsert(data, { onConflict: 'source_lesson_id' })
-- generates a plain `ON CONFLICT (source_lesson_id)` clause, which Postgres
-- cannot match against a PARTIAL unique index (idx_reteach_lessons_one_per_lesson,
-- `where deleted_at is null`) without also repeating that WHERE predicate in
-- the conflict clause — something the JS client has no option to pass through.
-- Result: every generate/regenerate upsert failed with 42P10 ("there is no
-- unique or exclusion constraint matching the ON CONFLICT specification"),
-- surfaced in the app as "Generated content could not be saved."
--
-- Fix: drop the partial index, add a real (non-partial) UNIQUE constraint on
-- source_lesson_id instead. This means a lesson can never have more than one
-- reteach_lessons row even if a prior one was soft-deleted — acceptable
-- trade-off, since soft-deleted re-teach lessons aren't expected to be a
-- real workflow (unlike lessons/courses/etc., nothing in this project ever
-- soft-deletes a reteach_lessons row in the first place — no action calls
-- sets deleted_at on this table at all currently).

drop index if exists idx_reteach_lessons_one_per_lesson;

alter table reteach_lessons
    add constraint reteach_lessons_source_lesson_id_unique unique (source_lesson_id);
