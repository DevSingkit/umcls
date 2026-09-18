-- 081_enrollments_insert_teacher.sql
-- Lets a teacher enroll a student into their OWN course. Previously
-- only enrollments_insert_admin existed, so a teacher-facing enroll
-- feature would fail at the RLS layer even with a correct app-side
-- check. Mirrors the ownership check already used by
-- is_course_teacher() in enrollments_select — a teacher may only
-- insert an enrollment row for a course where courses.teacher_id =
-- auth.uid().
create policy enrollments_insert_teacher
on public.enrollments
for insert
to authenticated
with check (
    auth_role() = 'teacher'
    and is_course_teacher(course_id)
);
