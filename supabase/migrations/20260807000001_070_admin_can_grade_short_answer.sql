-- Allows admin, in addition to the owning teacher, to call
-- grade_short_answer_response(). Needed for the admin gradebook edit
-- feature: admin edits the same underlying scores a teacher would,
-- through the same RPC, rather than a separate write path.
--
-- Uses auth_role() (see migration 021) since that's the project's
-- already-established, non-stale way to check role — checks is_active
-- and deleted_at too, not just the users.role column directly.

CREATE OR REPLACE FUNCTION public.grade_short_answer_response(
  p_attempt_id uuid,
  p_question_id uuid,
  p_points_awarded numeric,
  p_feedback text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_teacher_id uuid;
begin
  select c.teacher_id into v_teacher_id
  from quiz_attempts a
  join quizzes q on q.id = a.quiz_id
  join courses c on c.id = q.course_id
  where a.id = p_attempt_id;

  if v_teacher_id is null then
    raise exception 'Attempt not found';
  end if;

  -- Owning teacher OR admin. auth_role() is the project's existing
  -- helper (checked against is_active/deleted_at, not stale).
  if v_teacher_id <> auth.uid() and auth_role() <> 'admin' then
    raise exception 'Not authorized to grade this attempt';
  end if;

  perform set_config('app.grading_in_progress', 'true', true);

  update quiz_responses
  set points_awarded = p_points_awarded,
      is_correct = p_points_awarded > 0,
      feedback = p_feedback
  where attempt_id = p_attempt_id
    and question_id = p_question_id;
end;
$function$;
