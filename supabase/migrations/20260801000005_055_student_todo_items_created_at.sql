-- 055: Add created_at to student_todo_items
--
-- The to-do list's sort order was changed (2026-08-01, see
-- CHANGELOG.md) from due_at ascending to created_at descending
-- ("newest posted first"). The application query
-- (features/todo/queries/todo-items.ts) was updated to select/order by
-- created_at, but the underlying view (migration 038) never exposed
-- that column — it only selected id, item_type, title, course_id,
-- due_at, lesson_id. Querying a column that doesn't exist on the view
-- returns a PostgREST error, which getMyTodoItems()'s existing
-- `if (error || !data) return []` silently swallows — the to-do list
-- going empty was that failure surfacing, not a real data problem.
--
-- CREATE OR REPLACE VIEW is safe here: created_at is appended as a new
-- trailing column only. None of the existing columns change name,
-- type, or position, so nothing already reading
-- id/item_type/title/course_id/due_at/lesson_id from this view is
-- affected by this change.

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
where a.is_published and a.deleted_at is null
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
where qz.is_published and qz.deleted_at is null;
