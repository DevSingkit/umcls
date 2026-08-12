-- Migration 080: delete_course RPC
--
-- courses was the one soft-deletable table left on a plain client-side
-- UPDATE, rather than going through the SECURITY DEFINER RPC pattern
-- already used for delete_lesson / delete_quiz / delete_assignment /
-- delete_material. Same root cause as those four: courses_update's
-- WITH CHECK cannot be satisfied by a row transitioning into a
-- soft-deleted state, so the raw UPDATE in deleteCourse() (features/
-- courses/actions/delete-course.ts) fails with 42501 on every course,
-- including a brand-new, fully empty one owned by the caller.
--
-- Fix: SECURITY DEFINER RPC that does the ownership check itself
-- (teacher owns the course, course not already deleted) and then
-- performs the soft delete, bypassing the client-role RLS check on
-- the write the same way the other four RPCs do.

create or replace function public.delete_course(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_teacher_id uuid;
  v_already_deleted timestamptz;
begin
  select teacher_id, deleted_at
    into v_course_teacher_id, v_already_deleted
    from public.courses
   where id = p_course_id;

  if v_course_teacher_id is null then
    raise exception 'Course not found.' using errcode = '42704';
  end if;

  if v_already_deleted is not null then
    raise exception 'Course already deleted.' using errcode = '42704';
  end if;

  if v_course_teacher_id <> auth.uid() and public.auth_role() <> 'admin' then
    raise exception 'Not authorized to delete this course.' using errcode = '42501';
  end if;

  update public.courses
     set deleted_at = now()
   where id = p_course_id;
end;
$$;

grant execute on function public.delete_course(uuid) to authenticated;

comment on function public.delete_course(uuid) is
  'Soft-deletes a course (sets deleted_at). SECURITY DEFINER because '
  'courses_update''s WITH CHECK rejects the deleted_at transition on a '
  'plain client UPDATE — same pattern as delete_lesson/delete_quiz/'
  'delete_assignment/delete_material.';
