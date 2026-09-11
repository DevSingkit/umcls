-- Migration 032: implement assignment_published, course_published,
-- submission_received
--
-- All three types already existed in notifications.type's CHECK
-- constraint (§11.6/§11.9), clearly intended to be used, but nothing —
-- no trigger, no application code — ever inserted them. Adding triggers
-- here, same shape as the existing notify_on_grade_return /
-- notify_on_quiz_fail (§7.5, §7.11): SECURITY DEFINER, fires on the
-- relevant is_published/insert transition, fans out via a join to
-- enrollments where needed.

-- 1. assignment_published: every actively-enrolled student gets
-- notified when a teacher publishes an assignment (toggleAssignmentPublish).
create or replace function notify_on_assignment_published()
returns trigger
language plpgsql security definer
as $$
begin
    if new.is_published = true and old.is_published = false then
        insert into notifications (user_id, type, title, body, link)
        select e.student_id,
               'assignment_published',
               'New assignment posted',
               '"' || new.title || '" has been posted.',
               '/student/courses/' || new.course_id || '/assignments/' || new.id
        from enrollments e
        where e.course_id = new.course_id
          and e.status = 'active';
    end if;
    return new;
end;
$$;

create trigger trg_notify_assignment_published
    after update on assignments
    for each row execute function notify_on_assignment_published();

-- 2. course_published: every actively-enrolled student gets notified
-- when a teacher publishes a course (toggleCoursePublish). Students can
-- be enrolled before a course is published — enrollStudent never checks
-- is_published — so this has a real recipient in that case.
create or replace function notify_on_course_published()
returns trigger
language plpgsql security definer
as $$
begin
    if new.is_published = true and old.is_published = false then
        insert into notifications (user_id, type, title, body, link)
        select e.student_id,
               'course_published',
               'Course now available',
               '"' || new.title || '" is now available.',
               '/student/courses/' || new.id
        from enrollments e
        where e.course_id = new.id
          and e.status = 'active';
    end if;
    return new;
end;
$$;

create trigger trg_notify_course_published
    after update on courses
    for each row execute function notify_on_course_published();

-- 3. submission_received: the course teacher gets notified when a
-- student submits or resubmits (submitAssignment). Fires on the initial
-- INSERT, and again on an UPDATE that transitions status into
-- 'resubmitted' — mirrors submitAssignment's own status logic
-- (features/assignments/actions/submissions.ts): a resubmission after a
-- prior grade is a genuinely new event worth a fresh notification, not
-- a duplicate of the first submission.
create or replace function notify_on_submission_received()
returns trigger
language plpgsql security definer
as $$
declare
    v_teacher_id       uuid;
    v_assignment_title text;
    v_course_id        uuid;
begin
    if (tg_op = 'INSERT')
       or (tg_op = 'UPDATE' and new.status = 'resubmitted' and old.status is distinct from 'resubmitted') then

        select a.title, a.course_id, c.teacher_id
        into v_assignment_title, v_course_id, v_teacher_id
        from assignments a
        join courses c on c.id = a.course_id
        where a.id = new.assignment_id;

        insert into notifications (user_id, type, title, body, link)
        values (
            v_teacher_id,
            'submission_received',
            'New submission received',
            'A student submitted "' || v_assignment_title || '".',
            '/teacher/courses/' || v_course_id || '/assignments/' || new.assignment_id
        );
    end if;
    return new;
end;
$$;

create trigger trg_notify_submission_received
    after insert or update on assignment_submissions
    for each row execute function notify_on_submission_received();
