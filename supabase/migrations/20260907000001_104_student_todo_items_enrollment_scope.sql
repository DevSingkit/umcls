-- 20260907000001_104_student_todo_items_enrollment_scope.sql
--
-- BUG FIX: student_todo_items (migrations 038/055/068) never actually
-- checked enrollment — it filtered by is_published and by whether the
-- student had already submitted/attempted, but any published
-- assignment/quiz in ANY course showed up for EVERY student regardless
-- of enrollment. Migration 068's own comment assumed the underlying
-- tables' RLS already scoped this correctly ("this view was previously
-- safe without RLS of its own") — that assumption was wrong: a
-- published assignment/quiz is readable by any authenticated student
-- per this app's RLS, independent of enrollment. Confirmed via a real
-- symptom: an unenrolled student's To-Do list showed another course's
-- quiz, and clicking it 404'd since the student page correctly blocks
-- access at that point — the bug was this view surfacing something
-- the student was never supposed to see listed at all.
--
-- Fix: add an explicit enrollments check to both halves of the union.
-- CREATE OR REPLACE VIEW is safe here for the same reason migrations
-- 055/068 were: no existing column changes name, type, or position —
-- only a new WHERE condition is added.

create or replace view student_todo_items as
select
    a.id,
    'assignment'::text as item_type,
    a.title,
    a.course_id,
    a.due_at,
    a.lesson_id,
    a.created_at
from assignments a
where a.is_published
  and a.deleted_at is null
  and exists (
      select 1
      from enrollments e
      where e.course_id = a.course_id
        and e.student_id = auth.uid()
        and e.status = 'active'
  )
  and not exists (
      select 1
      from assignment_submissions s
      where s.assignment_id = a.id
        and s.student_id = auth.uid()
  )
union all
select
    qz.id,
    'quiz'::text as item_type,
    qz.title,
    qz.course_id,
    qz.available_until as due_at,
    qz.lesson_id,
    qz.created_at
from quizzes qz
where qz.is_published
  and qz.deleted_at is null
  and exists (
      select 1
      from enrollments e
      where e.course_id = qz.course_id
        and e.student_id = auth.uid()
        and e.status = 'active'
  )
  and not exists (
      select 1
      from quiz_attempts qa
      where qa.quiz_id = qz.id
        and qa.student_id = auth.uid()
        and qa.status != 'in_progress'
  );