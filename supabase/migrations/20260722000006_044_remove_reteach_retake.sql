-- 044_remove_reteach_retake.sql

-- 1. Drop the two reteach-specific triggers first
drop trigger if exists trg_notify_quiz_fail on quiz_attempts;
drop trigger if exists trg_notify_students_reteach_publish on reteach_lessons;

-- 2. Drop their trigger functions
drop function if exists notify_on_quiz_fail();
drop function if exists notify_students_on_reteach_publish();

-- 3. Drop the tables (retake_requests first, it FKs to reteach_lessons)
drop table if exists reteach_retake_requests;
drop table if exists reteach_lessons;

-- 4. Rewrite check_max_attempts() to a plain max-attempts check, no retake bypass
create or replace function public.check_max_attempts()
returns trigger
language plpgsql
as $function$
declare
    v_max_attempts  integer;
    v_current_count integer;
begin
    select max_attempts into v_max_attempts
    from quizzes where id = new.quiz_id
    for update;

    select count(*) into v_current_count
    from quiz_attempts
    where quiz_id    = new.quiz_id
      and student_id = new.student_id
      and status    != 'abandoned';

    if v_current_count >= v_max_attempts then
        raise exception 'Maximum quiz attempts reached. Allowed: %, Used: %.',
            v_max_attempts, v_current_count
            using errcode = 'P0001';
    end if;

    new.attempt_number := v_current_count + 1;
    return new;
end;
$function$;

-- 5. Remove stale reteach-related notifications before tightening the constraint
delete from notifications
where type in ('reteach_lesson_available', 'student_below_passing_score');

-- 6. Remove the two reteach-only notification types from the check constraint
alter table notifications drop constraint notifications_type_check;

alter table notifications add constraint notifications_type_check
    check (type = any (array[
        'assignment_graded'::text,
        'submission_received'::text,
        'quiz_available'::text,
        'assignment_due_soon'::text,
        'course_published'::text,
        'assignment_published'::text,
        'general'::text
    ]));