-- 20260705_021_auth_role_is_active.sql
--
-- PH8-002 finding: auth_role() checked `role` but not `is_active`, so a
-- deactivated user whose JWT hadn't expired yet could still pass every
-- policy gated on auth_role() = 'student' / 'teacher' / 'admin' — e.g.
-- courses_select_student, lessons_select_student, quizzes_select_student.
--
-- AUTH_NOTES.md already explains why is_active is checked at the
-- application layer (requireRole/middleware) — this migration adds the
-- same check at the RLS layer, so a valid-but-still-live JWT that bypasses
-- the app entirely (a direct call to the Supabase REST/JS client) is also
-- blocked, not just app traffic.
--
-- Kept VOLATILE for the same reason as the original RC-04/FIND-003 note:
-- STABLE would let PostgreSQL cache the result within a transaction, which
-- would let an admin's deactivation not take effect until a new transaction.

create or replace function auth_role()
returns text
language sql volatile security definer
set search_path = public
as $$
    select role from users
    where id = auth.uid()
      and is_active = true
      and deleted_at is null;
$$;

-- ============================================================
-- Residual scope note — read before assuming this closes every gap
-- ============================================================
-- A handful of policies check `student_id = auth.uid()` or similar
-- directly, without going through auth_role() at all (e.g. attempts_select,
-- responses_select/insert, notifications_select, grades_select,
-- enrollments_select, users_self_update). Those remain reachable by a
-- deactivated user's still-valid JWT until it naturally expires
-- (ACCESS_TOKEN TTL = 3600s per tasks.md C-01).
--
-- This is treated as an accepted V1 risk, not a gap to close in this
-- migration, because:
--   1. It requires an attacker to already hold a specific deactivated
--      user's live JWT and call Supabase directly, bypassing the app
--      entirely (the app's own requireRole() check already blocks this
--      path for all normal usage).
--   2. The exposure window is bounded to at most 1 hour from
--      deactivation, not indefinite.
-- If this residual window needs closing for V2 (e.g. once real students
-- are being deactivated for disciplinary reasons, not just "left the
-- school" at year-end), the fix is a shared is_active_uid() helper
-- wrapping every direct auth.uid() comparison — a larger, deliberate
-- policy-file rewrite, not a quick patch here.