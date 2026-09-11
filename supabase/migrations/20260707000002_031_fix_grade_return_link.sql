-- Migration 031: fix notify_on_grade_return() link
--
-- The original trigger (§7.5) built the notification link as
-- '/student/assignments/' || new.assignment_id — but no such top-level
-- route exists. The real route is
-- /student/courses/{courseId}/assignments/{assignmentId}, nested under
-- a course. assignment_submissions only has assignment_id, not
-- course_id, so the corrected function looks it up via a join to
-- `assignments` before building the link.
--
-- create or replace function keeps the same signature/name, so the
-- existing trg_notify_grade_return trigger (already attached to
-- assignment_submissions) picks up this fix automatically — no need to
-- drop/recreate the trigger itself.

create or replace function notify_on_grade_return()
returns trigger
language plpgsql security definer
as $$
declare
    v_course_id uuid;
begin
    if new.status = 'returned' and old.status != 'returned' then
        select course_id into v_course_id
        from assignments
        where id = new.assignment_id;

        insert into notifications (user_id, type, title, body, link)
        values (
            new.student_id,
            'assignment_graded',
            'Assignment graded',
            'Your submission has been graded. Tap to view feedback.',
            '/student/courses/' || v_course_id || '/assignments/' || new.assignment_id
        );
    end if;
    return new;
end;
$$;
