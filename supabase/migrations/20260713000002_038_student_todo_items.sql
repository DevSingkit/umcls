-- Creates student_todo_items, documented in DATABASE.md §11.7 as
-- migration 027 but never actually written as a real migration file in
-- this project — confirmed missing via direct query against the live
-- DB on 2026-07-13 (relation does not exist, and schema_migrations
-- shows no gap where it could have been silently skipped either).
--
-- Union of published assignments + published quizzes only. Lessons and
-- materials must never appear here — this is the enforced product rule
-- from PRD FR-STU-01 / US-036, kept at the data layer so no future
-- application code can accidentally add lessons to a student's To-Do
-- list.

create or replace view student_todo_items as
select
    a.id,
    'assignment'::text as item_type,
    a.title,
    a.course_id,
    a.due_at,
    a.lesson_id
from assignments a
where a.is_published and a.deleted_at is null
union all
select
    qz.id,
    'quiz'::text as item_type,
    qz.title,
    qz.course_id,
    qz.available_until as due_at,
    qz.lesson_id
from quizzes qz
where qz.is_published and qz.deleted_at is null;