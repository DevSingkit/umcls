-- 053: toggle_assignment_publish RPC
--
-- Fixes a real bug found 2026-08-01: PostAssignmentButton ->
-- toggleAssignmentPublish appeared to work (button flipped to "Posted",
-- no error shown) but the assignment silently stayed unpublished in the
-- database. Root cause: toggleAssignmentPublish's plain UPDATE never
-- requested returned rows (no .select()) and never checked how many
-- rows were actually affected — when assignments_update_teacher's RLS
-- WITH CHECK silently rejects the update (the same class of issue
-- already worked around for delete_lesson/delete_quiz/delete_assignment/
-- delete_material/unsubmit_assignment — see DATABASE.md §3), Postgres/
-- PostgREST returns a normal successful response with zero rows changed
-- and NO error. The Server Action had no way to detect that and
-- returned { ok: true } regardless, so the UI showed "Posted" right up
-- until the next real fetch quietly reverted it.
--
-- This follows the same established pattern as the delete_* RPC family
-- instead of trying to patch around RLS: an explicit ownership check
-- inside a SECURITY DEFINER function, returning a real boolean so the
-- caller can tell a genuine "not found / not yours" apart from success.

create or replace function public.toggle_assignment_publish(p_assignment_id uuid, p_publish boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean;
begin
  update public.assignments a
  set is_published = p_publish
  from public.courses c
  where a.id = p_assignment_id
    and a.course_id = c.id
    and c.teacher_id = auth.uid()
    and a.deleted_at is null
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

grant execute on function public.toggle_assignment_publish(uuid, boolean) to authenticated;
