-- 105_lessons_created_by.sql
--
-- lessons had no author column at all — unlike quizzes and assignments,
-- which already have created_by. This meant that once a course got
-- reassigned to a different teacher (features/admin/actions/users.ts's
-- assignCourseTeacher, which only ever updates courses.teacher_id),
-- there was no way to know who actually wrote a given lesson: the
-- stream would have had to fall back to the course's CURRENT teacher,
-- silently reattributing every existing lesson to whoever teaches the
-- class now.
--
-- Backfilled from each lesson's course's teacher_id at migration time
-- — the best available answer for lessons that already exist, since no
-- better record of "who wrote this" exists pre-migration. Every course
-- going forward keeps the real author because createLesson (lessons.ts)
-- now sets created_by = the acting teacher's id at insert time, and
-- that value is never touched by reassignment.

ALTER TABLE public.lessons
  ADD COLUMN created_by uuid REFERENCES public.users(id);

UPDATE public.lessons
SET created_by = courses.teacher_id
FROM public.courses
WHERE lessons.course_id = courses.id
  AND lessons.created_by IS NULL;

-- courses.teacher_id is NOT NULL, so every lesson has a course with a
-- teacher to backfill from — safe to enforce NOT NULL from here on,
-- matching quizzes.created_by / assignments.created_by.
ALTER TABLE public.lessons
  ALTER COLUMN created_by SET NOT NULL;
