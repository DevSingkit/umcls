-- 20260910000002_107_activity_question_options_missing_delete_policy.sql
-- Real, confirmed bug — not a client code issue. Migration 096
-- (fix_activity_questions_rls.sql) dropped the old catch-all
-- "activity_question_options_teacher_all" FOR ALL policy and replaced
-- it with ONLY a SELECT policy and an INSERT policy. No DELETE policy
-- and no UPDATE policy were ever added back. Under RLS, an operation
-- with no matching policy is denied by default — so DELETE against
-- this table has had zero valid grant for any teacher, regardless of
-- ownership, since migration 096 ran.
--
-- Confirmed via direct code read: create-activity.ts's updateActivity
-- deletes existing activity_question_options rows (via the regular,
-- RLS-scoped client, not an admin client) before re-inserting the
-- edited set — exactly the "wipe and rebuild" pattern this file's own
-- header comment describes. That delete has been silently failing
-- ever since migration 096, surfacing to teachers as "Could not
-- update the answer options" on every edit that touches existing
-- questions.
--
-- Same ownership chain as the existing INSERT policy (migration 096),
-- one level deeper (question -> activity -> mission -> lesson ->
-- course), for both DELETE and UPDATE.

create policy "activity_question_options_delete"
on public.activity_question_options for delete to authenticated
using (
    auth_role() = 'teacher'
    and is_course_teacher((
        select l.course_id from public.activity_questions q
        join public.activities a on a.id = q.activity_id
        join public.missions m on m.id = a.mission_id
        join public.lessons l on l.id = m.lesson_id
        where q.id = activity_question_options.question_id
    ))
);

create policy "activity_question_options_update"
on public.activity_question_options for update to authenticated
using (
    auth_role() = 'teacher'
    and is_course_teacher((
        select l.course_id from public.activity_questions q
        join public.activities a on a.id = q.activity_id
        join public.missions m on m.id = a.mission_id
        join public.lessons l on l.id = m.lesson_id
        where q.id = activity_question_options.question_id
    ))
);
