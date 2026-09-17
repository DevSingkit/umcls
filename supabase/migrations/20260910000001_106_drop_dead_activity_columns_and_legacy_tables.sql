-- 20260910000001_106_drop_dead_activity_columns_and_legacy_tables.sql
-- Cleanup pass — every item below was confirmed via direct code audit
-- (create-activity.ts, create-mission.ts, submit-question-attempt.ts
-- read fresh in full) before writing this migration, not assumed from
-- the schema alone.
--
-- 1. attempt_events.quiz_id — no FK constraint at all (every other
--    reference column on this table has one), and no code anywhere
--    writes or reads it. Traced back to an unreliable external
--    session summary pasted into this project earlier, whose other
--    schema claims about this same table already turned out to be
--    wrong — this column is very likely a leftover from that session,
--    never wired to anything real. Dropped.
--
-- 2. activity_options — the pre-migration-094 single-question-per-
--    activity options table, fully superseded by
--    activity_question_options. Confirmed 0 rows via a live database
--    audit this session, and zero code references anywhere across all
--    three files checked. Dropped entirely.
--
--    CORRECTION (2026-09-10, second pass): this migration originally
--    failed to apply — Postgres correctly refused, because
--    activity_options_for_student (a view, per migration 094's own
--    header comment referencing it as the established "is_correct
--    omitted" pattern) still depends on this table. Confirmed unused
--    before adding the drop below: get-mission-for-student.ts (read
--    fresh, in full, this session) reads from
--    activity_question_options_for_student — the migration-095
--    successor view — not this one, anywhere. Dropping the view
--    first, then the table, in dependency order.
--
-- 3. activities.prompt / activities.activity_type / activities.points
--    — NOT merely unused: actively WRITTEN with throwaway data on
--    every single activity create/update (create-activity.ts's
--    addActivity/updateActivity, create-mission.ts's
--    createMissionWithFirstActivity), purely to satisfy NOT NULL
--    constraints left over from before migration 094 moved real
--    content down to activity_questions. Both files' own comments say
--    as much ("not read anywhere in the new model"). Dropping these
--    actually SIMPLIFIES the application code — no more need to
--    compute a throwaway prompt/type/point value from the first
--    question just to satisfy a column. All call sites updated in the
--    same pass as this migration.
--
-- 4. activities.hint_text — confirmed via create-mission.ts's own
--    comment ("prompt/activity_type/hint_text no longer live on the
--    activity row") plus a direct grep across all three files: never
--    written, never read. Real content lives on
--    activity_questions.hint_text instead.
--
-- KEPT, NOT DROPPED: activities.remediates_activity_id — confirmed
-- ACTIVELY read in submit-question-attempt.ts (the remediation
-- lookup) and actively written/updated in both create-activity.ts and
-- create-mission.ts. This is real, live functionality, not dead
-- weight — do not drop this in a future pass without re-confirming.

drop view if exists public.activity_options_for_student;

drop table if exists public.activity_options;

alter table public.attempt_events
  drop column if exists quiz_id;

alter table public.activities
  drop column if exists prompt,
  drop column if exists activity_type,
  drop column if exists points,
  drop column if exists hint_text;