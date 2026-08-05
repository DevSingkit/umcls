-- Fixes: gradeShortAnswer's manual-grading UPDATE on quiz_responses was
-- being rejected by trg_prevent_late_response (via
-- prevent_response_after_expiry(), migration 060). That trigger fires
-- on ANY UPDATE to quiz_responses, including a teacher's manual score
-- entry, and requires quiz_attempts.status = 'in_progress' — but by the
-- time a teacher grades a short-answer response, the attempt is always
-- 'submitted' or 'graded', never 'in_progress'. The trigger was written
-- to stop a student sneaking in a late answer, not to stop a teacher
-- grading an already-submitted one, but it can't currently tell the two
-- apart. Using the admin/service-role client (as gradeShortAnswer
-- already did) doesn't help — service-role bypasses RLS, not triggers.
--
-- Fix follows the exact pattern already established by
-- archive_delete_audit_logs()/prevent_audit_log_mutation() elsewhere in
-- this project: a session-local flag lets one specific, trusted write
-- path bypass a trigger meant for a different actor, without weakening
-- the trigger for anyone else. Because this needs to be one atomic
-- Postgres call (a flag set via a separate supabase-js request would
-- not survive into a second, separate REST call/transaction), the flag
-- is set and the actual UPDATE both happen inside a single new
-- SECURITY DEFINER RPC, grade_short_answer_response — same
-- ownership-check-then-mutate family as delete_lesson/
-- toggle_assignment_publish/reset_quiz_attempts (migration 062).

create or replace function public.prevent_response_after_expiry()
returns trigger language plpgsql as $$
declare
    v_started_at      timestamptz;
    v_time_limit_min  integer;
    v_status          text;
    v_available_until timestamptz;
    v_allow_late      boolean;
begin
    -- Set only by grade_short_answer_response() below, for the
    -- duration of that one function call. A teacher grading an
    -- already-submitted response is legitimate regardless of attempt
    -- status or deadline — the student's submission window is what
    -- this trigger protects, not a teacher's later grading of it.
    if current_setting('app.grading_in_progress', true) = 'true' then
        return new;
    end if;

    select a.started_at, a.status, q.time_limit_minutes, q.available_until, q.allow_late
    into   v_started_at, v_status, v_time_limit_min, v_available_until, v_allow_late
    from quiz_attempts a
    join quizzes q on q.id = a.quiz_id
    where a.id = new.attempt_id;

    if v_status != 'in_progress' then
        raise exception 'Attempt is not in progress (%). Responses cannot be modified.', v_status
            using errcode = 'P0001';
    end if;

    if v_time_limit_min is not null then
        if now() > v_started_at + (v_time_limit_min || ' minutes')::interval then
            raise exception 'Quiz time limit has expired. No further responses accepted.'
                using errcode = 'P0001';
        end if;
    end if;

    if v_available_until is not null and not v_allow_late then
        if now() > v_available_until then
            raise exception 'This quiz''s deadline has passed. No further responses accepted.'
                using errcode = 'P0001';
        end if;
    end if;

    return new;
end;
$$;

-- Teacher-only write path for grading one short-answer response.
-- Ownership is checked explicitly (attempt -> quiz -> course ->
-- teacher_id = auth.uid()) since SECURITY DEFINER bypasses RLS
-- entirely, same reasoning as every other function in this RPC family.
-- Must be called via the regular (session-bound) Supabase client, not
-- the admin/service-role client — auth.uid() resolves to null under
-- service-role, which would make the ownership check always fail.
create or replace function public.grade_short_answer_response(
  p_attempt_id uuid,
  p_question_id uuid,
  p_points_awarded numeric,
  p_feedback text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  if v_teacher_id <> auth.uid() then
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
$$;

grant execute on function public.grade_short_answer_response(uuid, uuid, numeric, text) to authenticated;
