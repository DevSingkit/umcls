-- 056: Notifications for quiz-publish and lesson-publish events
--
-- Extends student notification coverage beyond assignments and courses
-- (the only two publish-related triggers that previously existed —
-- notify_on_assignment_published, notify_on_course_published, see
-- DATABASE.md §3) to also cover quizzes and lessons, per explicit
-- product request 2026-08-01.
--
-- QUIZ: mirrors notify_on_assignment_published's shape — an AFTER
-- UPDATE trigger firing only on a real false -> true transition on
-- is_published, since quizzes keep the create-then-post flow (never
-- auto-published). Reuses the existing 'quiz_available' notification
-- type rather than adding a new one, since it already describes this
-- exact event and needs no schema change.
--
-- LESSON: structurally different, because lessons ALWAYS auto-publish
-- on creation (is_published defaults true, no draft state exists in
-- the UI today) — there is normally no false -> true UPDATE transition
-- to hook into. This trigger fires on INSERT (the common case: a new
-- lesson is already published) AND on UPDATE (in case a future feature
-- ever adds a lesson unpublish/republish toggle, which doesn't exist
-- today but shouldn't silently miss this notification if one is added
-- later). Uses a new 'lesson_published' notification type, added to
-- notifications.type's check constraint below, since no existing type
-- fits a lesson going live.
--
-- GUARD (both triggers, deliberate, not previously discussed with the
-- person who asked for this): only notifies if the parent COURSE is
-- already published. Without this, a teacher still building out a
-- brand-new draft course would trigger a notification per lesson
-- created, for content students can't actually see yet (RLS still
-- blocks an unpublished course), and the notification's link would be
-- dead on click. If this guard is unwanted, drop the
-- `and c.is_published` condition from both function bodies.
--
-- Both triggers notify every actively-enrolled student in the course
-- (enrollments.status = 'active'), same scoping as
-- notify_on_assignment_published.

-- 1. Add 'lesson_published' as a valid notifications.type value.
--    Assumes the default Postgres-generated constraint name for a
--    column-level CHECK on notifications.type (notifications_type_check)
--    — if your actual constraint has a different name, adjust the DROP
--    CONSTRAINT line below to match before running this.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type = any (array[
    'assignment_graded',
    'submission_received',
    'quiz_available',
    'assignment_due_soon',
    'course_published',
    'assignment_published',
    'lesson_published',
    'general'
  ]));

-- 2. Quiz publish notification
create or replace function public.notify_on_quiz_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.is_published is distinct from new.is_published) and new.is_published then
    insert into public.notifications (user_id, type, title, body, link)
    select
      e.student_id,
      'quiz_available',
      'New quiz posted',
      format('"%s" is now available in %s.', new.title, c.title),
      '/student/courses/' || new.course_id || '/quizzes/' || new.id
    from public.enrollments e
    join public.courses c on c.id = new.course_id
    where e.course_id = new.course_id
      and e.status = 'active'
      and c.is_published;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_quiz_published on public.quizzes;
create trigger trg_notify_quiz_published
  after update on public.quizzes
  for each row
  execute function public.notify_on_quiz_published();

-- 3. Lesson publish notification
create or replace function public.notify_on_lesson_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.is_published)
     or (tg_op = 'UPDATE' and old.is_published is distinct from new.is_published and new.is_published) then
    insert into public.notifications (user_id, type, title, body, link)
    select
      e.student_id,
      'lesson_published',
      'New lesson posted',
      format('"%s" is now available in %s.', new.title, c.title),
      '/student/courses/' || new.course_id || '/lessons/' || new.id
    from public.enrollments e
    join public.courses c on c.id = new.course_id
    where e.course_id = new.course_id
      and e.status = 'active'
      and c.is_published;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_lesson_published_insert on public.lessons;
create trigger trg_notify_lesson_published_insert
  after insert on public.lessons
  for each row
  execute function public.notify_on_lesson_published();

drop trigger if exists trg_notify_lesson_published_update on public.lessons;
create trigger trg_notify_lesson_published_update
  after update on public.lessons
  for each row
  execute function public.notify_on_lesson_published();
