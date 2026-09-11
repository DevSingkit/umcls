-- 054: Assignments auto-publish on creation (final decision, 2026-08-01)
--
-- This product decision went through three stages in one session (see
-- CHANGELOG.md 2026-08-01 for the full trail, kept rather than erased):
-- tried, reverted (the original report turned out to be an unrelated
-- unapplied-migration issue), then a real Post-button bug was found and
-- fixed (migration 053), and only after that was auto-publish tried
-- again and confirmed as the actual final decision.
--
-- Application code (features/assignments/actions/assignments.ts,
-- createAssignment) already inserts the row as a draft and immediately
-- publishes it via the toggle_assignment_publish() RPC (migration 053)
-- in the same call — that alone is sufficient for the app's own
-- creation flow. This migration exists only to keep the *schema
-- default* consistent with that decision, so any other insert path
-- into `assignments` (a future admin tool, a script, a different
-- feature) doesn't silently reintroduce a hidden draft state that only
-- this one code path knows to work around.
--
-- Quizzes are explicitly NOT part of this decision and are not touched
-- here — quizzes.is_published keeps migration 051's default of false.

alter table public.assignments
  alter column is_published set default true;
