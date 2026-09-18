-- Adds missing with_check clauses to 12 UPDATE policies found by the
-- pg_policies audit on 2026-07-13. Each policy previously had `using`
-- only, meaning Postgres checked permission on the row BEFORE the
-- update but never re-checked the row AFTER the update. Same class of
-- gap as materials_update_teacher (migration 035) and reteach_lessons
-- (SECURITY.md §4.6). with_check below repeats each policy's own
-- existing using clause, so this does not change what already works,
-- it only closes the after-update gap.
--
-- Two exceptions, both intentional: submissions_update and
-- attempts_update_student drop their status = 'x' condition from
-- with_check only (kept in using) because the whole point of those
-- updates is to transition status away from that value. Same reasoning
-- applied to responses_update's in_progress check.

drop policy if exists "courses_update" on courses;
create policy "courses_update"
on courses for update to authenticated
using (
    (auth_role() = 'teacher' and teacher_id = auth.uid())
    or auth_role() = 'admin'
)
with check (
    (auth_role() = 'teacher' and teacher_id = auth.uid())
    or auth_role() = 'admin'
);

drop policy if exists "enrollments_update_admin" on enrollments;
create policy "enrollments_update_admin"
on enrollments for update to authenticated
using (auth_role() = 'admin')
with check (auth_role() = 'admin');

drop policy if exists "lessons_update" on lessons;
create policy "lessons_update"
on lessons for update to authenticated
using (auth_role() = 'teacher' and is_course_teacher(course_id))
with check (auth_role() = 'teacher' and is_course_teacher(course_id));

drop policy if exists "qbank_update" on question_bank;
create policy "qbank_update"
on question_bank for update to authenticated
using (created_by = auth.uid() or auth_role() = 'admin')
with check (created_by = auth.uid() or auth_role() = 'admin');

drop policy if exists "assignments_update" on assignments;
create policy "assignments_update"
on assignments for update to authenticated
using (auth_role() = 'teacher' and is_course_teacher(course_id))
with check (auth_role() = 'teacher' and is_course_teacher(course_id));

drop policy if exists "submissions_update" on assignment_submissions;
create policy "submissions_update"
on assignment_submissions for update to authenticated
using (
    (auth_role() = 'student' and student_id = auth.uid() and status = 'submitted')
    or (auth_role() = 'teacher' and is_course_teacher(
        (select course_id from assignments where id = assignment_id)
    ))
)
with check (
    (auth_role() = 'student' and student_id = auth.uid())
    or (auth_role() = 'teacher' and is_course_teacher(
        (select course_id from assignments where id = assignment_id)
    ))
);

drop policy if exists "quizzes_update" on quizzes;
create policy "quizzes_update"
on quizzes for update to authenticated
using (auth_role() = 'teacher' and is_course_teacher(course_id))
with check (auth_role() = 'teacher' and is_course_teacher(course_id));

drop policy if exists "questions_update" on questions;
create policy "questions_update"
on questions for update to authenticated
using (
    auth_role() = 'teacher'
    and is_course_teacher((select course_id from quizzes where id = quiz_id))
)
with check (
    auth_role() = 'teacher'
    and is_course_teacher((select course_id from quizzes where id = quiz_id))
);

drop policy if exists "attempts_update_student" on quiz_attempts;
create policy "attempts_update_student"
on quiz_attempts for update to authenticated
using (
    (auth_role() = 'student' and student_id = auth.uid() and status = 'in_progress')
    or (auth_role() = 'teacher' and is_course_teacher(
        (select course_id from quizzes where id = quiz_id)
    ))
)
with check (
    (auth_role() = 'student' and student_id = auth.uid())
    or (auth_role() = 'teacher' and is_course_teacher(
        (select course_id from quizzes where id = quiz_id)
    ))
);

drop policy if exists "responses_update" on quiz_responses;
create policy "responses_update"
on quiz_responses for update to authenticated
using (
    exists (
        select 1 from quiz_attempts a
        where a.id = attempt_id
          and a.student_id = auth.uid()
          and a.status = 'in_progress'
    )
)
with check (
    exists (
        select 1 from quiz_attempts a
        where a.id = attempt_id
          and a.student_id = auth.uid()
    )
);

drop policy if exists "recs_update_student" on recommendations;
create policy "recs_update_student"
on recommendations for update to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists "notifications_update" on notifications;
create policy "notifications_update"
on notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());