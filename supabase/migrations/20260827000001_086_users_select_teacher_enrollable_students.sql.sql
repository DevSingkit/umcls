-- 086_users_select_teacher_enrollable_students.sql
-- Lets a teacher see active student rows for the purposes of browsing
-- who to enroll, even before that student has ever been enrolled in
-- any of the teacher's courses. Previously users_select_scoped only
-- let a teacher see a student row if an enrollments row already
-- linked that student to one of the teacher's courses — correct for
-- "view a student you already teach," but it created a chicken-and-
-- egg gap for a brand-new student who has never been enrolled
-- anywhere yet: getEnrollableStudents() (enroll-student.ts) would
-- silently return nothing for them, with no error, since RLS just
-- filters the row out rather than failing loudly.
--
-- Deliberately a NEW policy rather than an edit to users_select_scoped
-- — RLS policies are OR'd together, so this only ADDS a narrow,
-- separate path to SELECT: role = 'student' AND is_active = true AND
-- not soft-deleted. It does not grant a teacher any visibility into
-- other teachers' or admins' rows, and does not touch
-- users_select_scoped's existing enrolled-student behavior at all.
create policy teachers_view_active_students_for_enrollment
on public.users
for select
to authenticated
using (
    auth_role() = 'teacher'
    and role = 'student'
    and is_active = true
    and deleted_at is null
);
