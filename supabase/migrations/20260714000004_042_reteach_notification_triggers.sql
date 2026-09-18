-- 20260714000004_042_reteach_notification_triggers.sql
-- Adds the two notification triggers from database.md §7.11a/§7.11b.
-- Covers both possible orderings:
--   (a) a student fails a quiz that already has a published re-teach lesson
--   (b) a teacher publishes a re-teach lesson after some students already failed
-- Neither trigger affects reteach_lessons visibility itself (that's RLS,
-- migration 039) — these only control who gets proactively notified.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS before
-- each CREATE TRIGGER, safe to rerun.
--
-- Depends on: reteach_lessons (039), notifications.type already allowing
-- 'reteach_lesson_available' and 'student_below_passing_score' — confirmed
-- present in the live schema dump 2026-07-14, no migration needed for that.

-- 7.11a: fires on every quiz_attempts grading transition into "failed"
create or replace function notify_on_quiz_fail()
returns trigger
language plpgsql security definer
as $$
declare
    v_teacher_id        uuid;
    v_quiz_title        text;
    v_course_id         uuid;
    v_reteach_lesson_id uuid;
begin
    if new.status = 'graded' and new.is_passing = false
       and (old.status is distinct from 'graded' or old.is_passing is distinct from false) then

        select q.title, q.course_id, c.teacher_id
        into v_quiz_title, v_course_id, v_teacher_id
        from quizzes q
        join courses c on c.id = q.course_id
        where q.id = new.quiz_id;

        -- Teacher: always notified on any individual failure, whether or
        -- not a re-teach lesson exists yet.
        insert into notifications (user_id, type, title, body, link)
        values (
            v_teacher_id,
            'student_below_passing_score',
            'Student below passing score',
            'A student scored below the passing threshold on "' || v_quiz_title || '".',
            '/teacher/courses/' || v_course_id || '/quizzes/' || new.quiz_id || '/attempts'
        );

        -- Student: only notified if a re-teach lesson is already published
        -- for this quiz.
        select id into v_reteach_lesson_id
        from reteach_lessons
        where quiz_id = new.quiz_id
          and is_published = true
          and deleted_at is null
        limit 1;

        if v_reteach_lesson_id is not null then
            insert into notifications (user_id, type, title, body, link)
            values (
                new.student_id,
                'reteach_lesson_available',
                'Simplified lesson available',
                'A simplified lesson is available to help with "' || v_quiz_title || '".',
                '/student/reteach/' || v_reteach_lesson_id
            );
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notify_quiz_fail on quiz_attempts;
create trigger trg_notify_quiz_fail
    after update on quiz_attempts
    for each row execute function notify_on_quiz_fail();

-- 7.11b: fires when a teacher publishes a re-teach lesson that already-
-- failing students should be notified about immediately, rather than
-- waiting for their next graded attempt to trigger 7.11a.
create or replace function notify_students_on_reteach_publish()
returns trigger
language plpgsql security definer
as $$
declare
    v_quiz_title text;
begin
    if new.is_published = true and old.is_published = false and new.quiz_id is not null then

        select title into v_quiz_title from quizzes where id = new.quiz_id;

        insert into notifications (user_id, type, title, body, link)
        select distinct qa.student_id,
               'reteach_lesson_available',
               'Simplified lesson available',
               'A simplified lesson is available to help with "' || v_quiz_title || '".',
               '/student/reteach/' || new.id
        from quiz_attempts qa
        where qa.quiz_id = new.quiz_id
          and qa.status = 'graded'
          and qa.is_passing = false;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notify_students_reteach_publish on reteach_lessons;
create trigger trg_notify_students_reteach_publish
    after update on reteach_lessons
    for each row execute function notify_students_on_reteach_publish();
