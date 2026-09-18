-- Migration 095: activity_question_options_for_student view
--
-- Closes a defense-in-depth gap flagged during the migration-094
-- multi-question rebuild: activity_question_options had SELECT
-- revoked from `authenticated` (matching activity_options'
-- established pattern), but no equivalent
-- "*_for_student" view was ever created for it — meaning there was NO
-- RLS-safe path for a student to read question option text at all.
-- get-mission-for-student.ts's getMissionPreviewForStudent worked
-- around this using the admin/service-role client with an explicitly
-- narrow column list as a stopgap — a valid but weaker safeguard than
-- every other student-facing option read in this app has (relies on
-- file-level discipline instead of a database-level guarantee).
--
-- This migration mirrors migration 082's activity_options_for_student
-- view exactly (same security_invoker=false, same revoke/grant
-- pattern, same excluded is_correct column) — copied from that
-- migration's real, verified DDL, not reconstructed from usage alone.

create or replace view activity_question_options_for_student
with (security_invoker = false) as
    select id, question_id, option_text, order_index
    from activity_question_options;
-- is_correct intentionally excluded — same reasoning as
-- answer_options_for_student / activity_options_for_student.

-- activity_question_options' SELECT was already revoked from
-- `authenticated` by migration 094, and its teacher/admin-only SELECT
-- policy already exists there too — this migration only adds the
-- missing view + grants, it does not touch the base table's RLS.
grant select on activity_question_options_for_student to authenticated;
grant select on activity_question_options to service_role;
