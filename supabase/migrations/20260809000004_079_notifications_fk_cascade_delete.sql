-- Adds real foreign keys from notifications back to their source
-- lesson/quiz/assignment, with ON DELETE CASCADE, so deleting one of
-- those automatically removes its notifications at the database level
-- — no application code, no string-matching on `link`, no risk of a
-- link format ever drifting out of sync with a manual matcher.
--
-- All three are nullable and mutually exclusive in practice (a given
-- notification's type determines which one, if any, is set) — not
-- enforced by a CHECK constraint here, since a few notification types
-- (course_published, general) legitimately have none of the three set.
--
-- Existing rows are backfilled by parsing their `link` column, which
-- has a small, fixed set of known path shapes (confirmed against every
-- notify_on_* trigger's actual INSERT statement):
--   /student|teacher/courses/{courseId}/assignments/{assignmentId}
--   /student|teacher/courses/{courseId}/lessons/{lessonId}
--   /student|teacher/courses/{courseId}/quizzes/{quizId}
-- Rows whose link doesn't match any of these (course_published,
-- general, or a null link) simply keep all three columns null — they
-- were never tied to a lesson/quiz/assignment in the first place.

ALTER TABLE public.notifications
  ADD COLUMN lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  ADD COLUMN quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  ADD COLUMN assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE;

-- Backfill: assignment_id from any link containing "/assignments/{uuid}"
UPDATE public.notifications
SET assignment_id = (regexp_match(link, '/assignments/([0-9a-fA-F-]{36})'))[1]::uuid
WHERE link ~ '/assignments/[0-9a-fA-F-]{36}';

-- Backfill: lesson_id from any link containing "/lessons/{uuid}"
UPDATE public.notifications
SET lesson_id = (regexp_match(link, '/lessons/([0-9a-fA-F-]{36})'))[1]::uuid
WHERE link ~ '/lessons/[0-9a-fA-F-]{36}';

-- Backfill: quiz_id from any link containing "/quizzes/{uuid}"
UPDATE public.notifications
SET quiz_id = (regexp_match(link, '/quizzes/([0-9a-fA-F-]{36})'))[1]::uuid
WHERE link ~ '/quizzes/[0-9a-fA-F-]{36}';

CREATE INDEX notifications_lesson_id_idx ON public.notifications (lesson_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX notifications_quiz_id_idx ON public.notifications (quiz_id) WHERE quiz_id IS NOT NULL;
CREATE INDEX notifications_assignment_id_idx ON public.notifications (assignment_id) WHERE assignment_id IS NOT NULL;

-- Every notify_on_* trigger now also sets the matching FK column, so
-- every NEW notification going forward is tied for real, not just
-- backfilled once. Each function is fully redefined (CREATE OR
-- REPLACE) rather than ALTERed, since Postgres has no partial-function
-- edit — this is the standard pattern already used elsewhere in this
-- project's migrations for modifying an existing trigger function.

CREATE OR REPLACE FUNCTION public.notify_on_assignment_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
    if new.is_published = true and old.is_published = false then
        insert into notifications (user_id, type, title, body, link, assignment_id)
        select e.student_id,
               'assignment_published',
               'New assignment posted',
               '"' || new.title || '" has been posted.',
               '/student/courses/' || new.course_id || '/assignments/' || new.id,
               new.id
        from enrollments e
        where e.course_id = new.course_id
          and e.status = 'active';
    end if;
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_grade_return()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    v_course_id uuid;
begin
    if new.status = 'returned' and old.status != 'returned' then
        select course_id into v_course_id
        from assignments
        where id = new.assignment_id;

        insert into notifications (user_id, type, title, body, link, assignment_id)
        values (
            new.student_id,
            'assignment_graded',
            'Assignment graded',
            'Your submission has been graded. Tap to view feedback.',
            '/student/courses/' || v_course_id || '/assignments/' || new.assignment_id,
            new.assignment_id
        );
    end if;
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_lesson_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op = 'INSERT' and new.is_published)
     or (tg_op = 'UPDATE' and old.is_published is distinct from new.is_published and new.is_published) then
    insert into public.notifications (user_id, type, title, body, link, lesson_id)
    select
      e.student_id,
      'lesson_published',
      'New lesson posted',
      format('"%s" is now available in %s.', new.title, c.title),
      '/student/courses/' || new.course_id || '/lessons/' || new.id,
      new.id
    from public.enrollments e
    join public.courses c on c.id = new.course_id
    where e.course_id = new.course_id
      and e.status = 'active'
      and c.is_published;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_quiz_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (old.is_published is distinct from new.is_published) and new.is_published then
    insert into public.notifications (user_id, type, title, body, link, quiz_id)
    select
      e.student_id,
      'quiz_available',
      'New quiz posted',
      format('"%s" is now available in %s.', new.title, c.title),
      '/student/courses/' || new.course_id || '/quizzes/' || new.id,
      new.id
    from public.enrollments e
    join public.courses c on c.id = new.course_id
    where e.course_id = new.course_id
      and e.status = 'active'
      and c.is_published;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_submission_received()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

        insert into notifications (user_id, type, title, body, link, assignment_id)
        values (
            v_teacher_id,
            'submission_received',
            'New submission received',
            'A student submitted "' || v_assignment_title || '".',
            '/teacher/courses/' || v_course_id || '/assignments/' || new.assignment_id,
            new.assignment_id
        );
    end if;
    return new;
end;
$function$;
