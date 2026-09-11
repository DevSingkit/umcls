-- 20260830000002_093_reset_mission_progress_rpc.sql
-- Gap #2 from the "what logic is still missing before the design
-- pass" review (2026-08-30, continued conversation): AddActivityForm.tsx's
-- own comment flagged this explicitly — "No 'reset attempts' confirm
-- step after adding to an already-live mission... deferred to
-- whenever Day 4 builds the mastery-loop write path." Day 4 (Phase 2)
-- is long done; this closes that deferred gap.
--
-- Mirrors reset_quiz_attempts (migration 062) exactly: same
-- SECURITY DEFINER + explicit-ownership-check family as
-- delete_lesson/delete_quiz/delete_assignment/delete_material/
-- unsubmit_assignment/toggle_assignment_publish/delete_lesson —
-- ownership checked in SQL, not left to RLS, same reasoning as that
-- whole RPC family.
--
-- THREE tables need clearing here, not one, because missions split
-- what quizzes keep in a single quiz_attempts/quiz_responses pair
-- across three: mission_progress (mission-level streak/status),
-- attempt_events (the raw per-answer log), and activity_mastery
-- (per-activity streak/state, added in Phase 1 this session — did not
-- exist when quizzes' reset_quiz_attempts was originally written, so
-- there was no equivalent third table to reset back then either).
--
-- None of these three tables are referenced by any other table's
-- foreign key (confirmed against the schema — nothing points AT
-- mission_progress, attempt_events, or activity_mastery), so deletion
-- order between them doesn't matter the way quiz_responses-before-
-- quiz_attempts did for the FK-constrained quiz case.
--
-- Returns the number of DISTINCT STUDENTS affected (i.e. rows deleted
-- from mission_progress, which has a unique (mission_id, student_id)
-- constraint — one row per student, unlike quiz_attempts which allows
-- multiple attempts per student) — more useful for a confirm-dialog
-- UI ("this will reset progress for N students") than a raw row count
-- across all three tables combined.
create or replace function public.reset_mission_progress(p_mission_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid;
  v_affected_students integer;
begin
  select c.teacher_id into v_teacher_id
  from public.missions m
  join public.lessons l on l.id = m.lesson_id
  join public.courses c on c.id = l.course_id
  where m.id = p_mission_id;

  if v_teacher_id is null then
    raise exception 'Mission not found';
  end if;

  if v_teacher_id <> auth.uid() then
    raise exception 'Not authorized to reset progress for this mission';
  end if;

  delete from public.attempt_events
  where activity_id in (select id from public.activities where mission_id = p_mission_id);

  delete from public.activity_mastery
  where activity_id in (select id from public.activities where mission_id = p_mission_id);

  with deleted as (
    delete from public.mission_progress where mission_id = p_mission_id
    returning student_id
  )
  select count(*) into v_affected_students from deleted;

  return v_affected_students;
end;
$$;

grant execute on function public.reset_mission_progress(uuid) to authenticated;
