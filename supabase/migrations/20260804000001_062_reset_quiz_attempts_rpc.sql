-- Lets a teacher wipe every existing attempt (and its responses) for a
-- quiz after editing/adding/removing questions on an already-posted
-- quiz, so students who already attempted it can retake the corrected
-- version instead of being permanently done against stale content.
-- Same SECURITY DEFINER + explicit-ownership-check family as
-- delete_lesson/delete_quiz/delete_assignment/delete_material/
-- unsubmit_assignment/toggle_assignment_publish (migration 053) — a
-- raw client-side DELETE would need its own RLS policy scoped to
-- "owns the quiz via its course," which this function does more
-- simply, matching the established reasoning for the whole RPC family.
--
-- quiz_responses.attempt_id -> quiz_attempts.id has no ON DELETE
-- CASCADE in the live schema, so quiz_responses must be deleted
-- explicitly first, or a plain `delete from quiz_attempts` would fail
-- with a foreign key violation the moment any response rows exist.
create or replace function public.reset_quiz_attempts(p_quiz_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid;
  v_deleted_count integer;
begin
  select c.teacher_id into v_teacher_id
  from public.quizzes q
  join public.courses c on c.id = q.course_id
  where q.id = p_quiz_id;

  if v_teacher_id is null then
    raise exception 'Quiz not found';
  end if;

  if v_teacher_id <> auth.uid() then
    raise exception 'Not authorized to reset attempts for this quiz';
  end if;

  delete from public.quiz_responses
  where attempt_id in (select id from public.quiz_attempts where quiz_id = p_quiz_id);

  with deleted as (
    delete from public.quiz_attempts where quiz_id = p_quiz_id
    returning id
  )
  select count(*) into v_deleted_count from deleted;

  return v_deleted_count;
end;
$$;

grant execute on function public.reset_quiz_attempts(uuid) to authenticated;
