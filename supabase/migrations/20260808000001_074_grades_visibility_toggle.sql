-- Per-course toggle controlling whether a student can see their own
-- Final Grade. Defaults to false — hidden until the teacher (or admin)
-- explicitly turns it on for that course. When off, the student still
-- sees the course/subject listed on their grades page, just with an
-- empty cell instead of a number — see get-my-final-grade.ts.

ALTER TABLE public.courses
  ADD COLUMN grades_visible_to_students boolean NOT NULL DEFAULT false;
