-- 049_students_view_own_teachers.sql
-- Students could only ever see their own row in `users` (per
-- users_select_scoped), which is correct for privacy but too strict
-- for cases like lesson_comments' join to users!lesson_comments_author_id_fkey
-- for the teacher's name/role — that join silently returned null for
-- students, showing "Unknown" instead of the teacher's name.
--
-- Additive policy: a student can see the profile of any teacher who
-- teaches a course they are actively enrolled in. RLS policies are
-- OR'd together, so this only adds visibility — it doesn't loosen or
-- replace users_select_scoped.
create policy students_view_own_teachers
on users
for select
to authenticated
using (
    auth_role() = 'student'
    and exists (
        select 1 from courses c
        join enrollments e on e.course_id = c.id
        where c.teacher_id = users.id
          and e.student_id = auth.uid()
          and e.status = 'active'
    )
);
