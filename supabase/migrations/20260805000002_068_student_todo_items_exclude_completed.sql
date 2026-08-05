-- 20260805000002_068_student_todo_items_exclude_completed.sql
--
-- Real gap found: student_todo_items (migration 038) is a plain union
-- of every published assignment/quiz — it never checked whether the
-- calling student had already submitted or attempted the item. A
-- student who already turned in an assignment, or already took a
-- quiz, still saw it sitting on their To-Do list forever.
--
-- Fix: the view now filters using auth.uid() directly, excluding an
-- assignment once a row exists in assignment_submissions for that
-- student (any status — submitted, resubmitted, graded, or returned
-- all mean "already turned something in," so all of them clear it),
-- and excluding a quiz once an attempt exists for that student that
-- isn't still in_progress (submitted/graded/abandoned all clear it —
-- only a genuinely unfinished attempt should leave the quiz on the
-- list, since the student still has something to do there).
--
-- CREATE OR REPLACE VIEW is safe here in the same sense migration 055
-- was: the existing columns (id, item_type, title, course_id, due_at,
-- lesson_id, created_at) are unchanged in name, type, or position —
-- this migration only adds new WHERE conditions, it doesn't touch the
-- select list. getMyTodoItems() needs no changes as a result.
--
-- Note: this view was previously safe without RLS of its own because
-- the underlying tables' RLS already scoped rows to the student's
-- enrolled courses. Referencing auth.uid() directly inside the view
-- keeps that same safety model — it's still reading only what the
-- calling student's own session is already allowed to see, just now
-- also checking their own submission/attempt rows the same way.

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
  and not exists (
      select 1
      from quiz_attempts qa
      where qa.quiz_id = qz.id
        and qa.student_id = auth.uid()
        and qa.status != 'in_progress'
  );
