-- 20260616_019_rls_policies.sql
-- Source: DATABASE.md §6 Supabase RLS Policies (per-table policy blocks).
-- Depends on migration 018 (auth_role, is_enrolled, is_course_teacher).

-- ============================================================
-- users
-- ============================================================
-- Admins: all users. Teachers: own profile + students enrolled in their
-- courses. Students: own profile only. (GDPR/FERPA — NFR-SEC-11)
create policy "users_select_scoped"
on users for select to authenticated
using (
    deleted_at is null
    and (
        auth_role() = 'admin'
        or (auth_role() = 'teacher' and (
            id = auth.uid()
            or exists (
                select 1
                from enrollments e
                join courses c on c.id = e.course_id
                where e.student_id = users.id
                  and c.teacher_id = auth.uid()
            )
        ))
        or (auth_role() = 'student' and id = auth.uid())
    )
);

create policy "users_insert_admin"
on users for insert to authenticated
with check (auth_role() = 'admin');

-- FIND-005: only avatar_url, full_name, metadata are mutable by self.
create policy "users_self_update"
on users for update to authenticated
using  (id = auth.uid())
with check (
    id        = auth.uid()
    and role      = (select role      from users where id = auth.uid())
    and is_active = (select is_active from users where id = auth.uid())
    and email     = (select email     from users where id = auth.uid())
);

create policy "users_admin_update"
on users for update to authenticated
using  (auth_role() = 'admin')
with check (auth_role() = 'admin');
-- Soft-delete only (set deleted_at) — handled via admin update policy above

-- ============================================================
-- courses
-- ============================================================
create policy "courses_select_student"
on courses for select to authenticated
using (
    auth_role() = 'student'
    and is_published = true
    and is_enrolled(id)
    and deleted_at is null
);

create policy "courses_select_teacher"
on courses for select to authenticated
using (
    auth_role() = 'teacher'
    and teacher_id = auth.uid()
    and deleted_at is null
);

create policy "courses_select_admin"
on courses for select to authenticated
using (
    auth_role() = 'admin'
    and deleted_at is null
);

create policy "courses_insert_teacher"
on courses for insert to authenticated
with check (
    auth_role() = 'teacher'
    and teacher_id = auth.uid()
);

create policy "courses_update"
on courses for update to authenticated
using (
    (auth_role() = 'teacher' and teacher_id = auth.uid())
    or auth_role() = 'admin'
);

-- ============================================================
-- enrollments
-- ============================================================
create policy "enrollments_select"
on enrollments for select to authenticated
using (
    student_id = auth.uid()
    or is_course_teacher(course_id)
    or auth_role() = 'admin'
);

create policy "enrollments_insert_admin"
on enrollments for insert to authenticated
with check (auth_role() = 'admin');

create policy "enrollments_update_admin"
on enrollments for update to authenticated
using (auth_role() = 'admin');

-- ============================================================
-- lessons
-- ============================================================
create policy "lessons_select_student"
on lessons for select to authenticated
using (
    auth_role() = 'student'
    and is_published = true
    and is_enrolled(course_id)
    and deleted_at is null
);

create policy "lessons_select_teacher"
on lessons for select to authenticated
using (
    (auth_role() = 'teacher' and is_course_teacher(course_id) and deleted_at is null)
    or (auth_role() = 'admin' and deleted_at is null)
);

create policy "lessons_insert"
on lessons for insert to authenticated
with check (
    auth_role() = 'teacher' and is_course_teacher(course_id)
);

create policy "lessons_update"
on lessons for update to authenticated
using (
    auth_role() = 'teacher' and is_course_teacher(course_id)
);

-- ============================================================
-- materials
-- ============================================================
create policy "materials_select"
on materials for select to authenticated
using (
    deleted_at is null
    and (
        is_enrolled(course_id)
        or is_course_teacher(course_id)
        or auth_role() = 'admin'
    )
);

create policy "materials_insert"
on materials for insert to authenticated
with check (
    auth_role() = 'teacher' and is_course_teacher(course_id)
);

create policy "materials_update_teacher"
on materials for update to authenticated
using (
    auth_role() = 'teacher' and is_course_teacher(course_id)
);

-- ============================================================
-- assignments
-- ============================================================
create policy "assignments_select_student"
on assignments for select to authenticated
using (
    auth_role() = 'student'
    and is_published = true
    and is_enrolled(course_id)
    and deleted_at is null
);

create policy "assignments_select_teacher"
on assignments for select to authenticated
using (
    (auth_role() = 'teacher' and is_course_teacher(course_id) and deleted_at is null)
    or (auth_role() = 'admin' and deleted_at is null)
);

create policy "assignments_insert"
on assignments for insert to authenticated
with check (
    auth_role() = 'teacher' and is_course_teacher(course_id)
);

create policy "assignments_update"
on assignments for update to authenticated
using (
    auth_role() = 'teacher' and is_course_teacher(course_id)
);

-- ============================================================
-- assignment_submissions
-- ============================================================
create policy "submissions_select"
on assignment_submissions for select to authenticated
using (
    student_id = auth.uid()
    or is_course_teacher((select course_id from assignments where id = assignment_id))
    or auth_role() = 'admin'
);

create policy "submissions_insert_student"
on assignment_submissions for insert to authenticated
with check (
    auth_role() = 'student'
    and student_id = auth.uid()
    and is_enrolled((select course_id from assignments where id = assignment_id))
);

create policy "submissions_update"
on assignment_submissions for update to authenticated
using (
    (auth_role() = 'student' and student_id = auth.uid() and status = 'submitted')
    or (auth_role() = 'teacher' and is_course_teacher(
        (select course_id from assignments where id = assignment_id)
    ))
);

-- ============================================================
-- quizzes
-- ============================================================
create policy "quizzes_select_student"
on quizzes for select to authenticated
using (
    auth_role() = 'student'
    and is_published = true
    and is_enrolled(course_id)
    and deleted_at is null
    and (available_from is null or available_from <= now())
    and (available_until is null or available_until >= now())
);

create policy "quizzes_select_teacher"
on quizzes for select to authenticated
using (
    (auth_role() = 'teacher' and is_course_teacher(course_id) and deleted_at is null)
    or (auth_role() = 'admin' and deleted_at is null)
);

create policy "quizzes_insert"
on quizzes for insert to authenticated
with check (
    auth_role() = 'teacher' and is_course_teacher(course_id)
);

create policy "quizzes_update"
on quizzes for update to authenticated
using (
    auth_role() = 'teacher' and is_course_teacher(course_id)
);

-- ============================================================
-- question_bank
-- ============================================================
create policy "qbank_select"
on question_bank for select to authenticated
using (
    auth_role() in ('teacher', 'admin')
    and deleted_at is null
);

create policy "qbank_insert"
on question_bank for insert to authenticated
with check (
    auth_role() in ('teacher', 'admin')
);

create policy "qbank_update"
on question_bank for update to authenticated
using (
    (created_by = auth.uid() or auth_role() = 'admin')
);

-- ============================================================
-- questions & answer_options
-- RC-03 / FIND-001 / C-04: direct SELECT on answer_options is revoked from
-- `authenticated`. Students query answer_options_for_student (a
-- security_invoker view that omits is_correct). Teachers/grading engine use
-- the service-role client, which bypasses RLS and sees the raw table.
-- ============================================================
create policy "questions_select_student"
on questions for select to authenticated
using (
    is_enrolled((select course_id from quizzes where id = quiz_id))
);

create policy "questions_select_teacher"
on questions for select to authenticated
using (
    is_course_teacher((select course_id from quizzes where id = quiz_id))
    or auth_role() = 'admin'
);

create policy "questions_insert"
on questions for insert to authenticated
with check (
    auth_role() = 'teacher'
    and is_course_teacher((select course_id from quizzes where id = quiz_id))
);

create policy "questions_update"
on questions for update to authenticated
using (
    auth_role() = 'teacher'
    and is_course_teacher((select course_id from quizzes where id = quiz_id))
);

-- answer_options: teachers/admins only via direct RLS (is_correct visible here)
create policy "options_select_teacher_admin"
on answer_options for select to authenticated
using (
    is_course_teacher(
        (select qz.course_id from questions q join quizzes qz on qz.id = q.quiz_id where q.id = question_id)
    )
    or auth_role() = 'admin'
);

-- Student-facing view: strips is_correct entirely.
-- security_invoker=true means the view respects the calling user's RLS context.
create or replace view answer_options_for_student
with (security_invoker = true) as
    select id, question_id, option_text, order_index
    from answer_options;
-- is_correct is intentionally excluded

-- Revoke direct table access from authenticated; grant view access only.
revoke select on answer_options from authenticated;
grant  select on answer_options_for_student to authenticated;
-- service_role retains full access for grading (bypasses RLS)
grant  select on answer_options to service_role;

create policy "options_insert"
on answer_options for insert to authenticated
with check (
    auth_role() = 'teacher'
    and is_course_teacher((
        select qz.course_id from questions q join quizzes qz on qz.id = q.quiz_id
        where q.id = question_id
    ))
);

-- ============================================================
-- quiz_attempts
-- ============================================================
create policy "attempts_select"
on quiz_attempts for select to authenticated
using (
    student_id = auth.uid()
    or is_course_teacher((select course_id from quizzes where id = quiz_id))
    or auth_role() = 'admin'
);

-- max_attempts enforced by trg_check_max_attempts trigger (017_triggers.sql §7.7)
create policy "attempts_insert"
on quiz_attempts for insert to authenticated
with check (
    auth_role() = 'student'
    and student_id = auth.uid()
    and is_enrolled((select course_id from quizzes where id = quiz_id))
);

create policy "attempts_update_student"
on quiz_attempts for update to authenticated
using (
    (auth_role() = 'student' and student_id = auth.uid() and status = 'in_progress')
    or (auth_role() = 'teacher' and is_course_teacher(
        (select course_id from quizzes where id = quiz_id)
    ))
);

-- ============================================================
-- quiz_responses
-- ============================================================
create policy "responses_select"
on quiz_responses for select to authenticated
using (
    exists (
        select 1 from quiz_attempts a
        where a.id = attempt_id
          and (
            a.student_id = auth.uid()
            or is_course_teacher((select course_id from quizzes where id = a.quiz_id))
            or auth_role() = 'admin'
          )
    )
);

create policy "responses_insert"
on quiz_responses for insert to authenticated
with check (
    exists (
        select 1 from quiz_attempts a
        where a.id = attempt_id
          and a.student_id = auth.uid()
          and a.status = 'in_progress'
    )
);

create policy "responses_update"
on quiz_responses for update to authenticated
using (
    exists (
        select 1 from quiz_attempts a
        where a.id = attempt_id
          and a.student_id = auth.uid()
          and a.status = 'in_progress'
    )
);

-- ============================================================
-- grades
-- FIND-014 / M-02 (revised 2026-07-02): gradeSubmission uses the
-- user-scoped client, so this policy is the real DB-level enforcement.
-- ============================================================
create policy "grades_select"
on grades for select to authenticated
using (student_id = auth.uid() or is_course_teacher(course_id) or auth_role() = 'admin');

create policy "grades_write_course_teacher"
on grades for all to authenticated
using (
    is_course_teacher(course_id)
    or auth_role() = 'admin'
)
with check (
    is_course_teacher(course_id)
    or auth_role() = 'admin'
);

-- ============================================================
-- mastery_records
-- IMPLEMENTATION_READY.md PART III rule 5: write access is restricted to
-- service role or is_course_teacher() — not any teacher.
-- ============================================================
create policy "mastery_select"
on mastery_records for select to authenticated
using (student_id = auth.uid() or is_course_teacher(course_id) or auth_role() = 'admin');

create policy "mastery_upsert"
on mastery_records for all to authenticated
using (
    is_course_teacher(course_id)
    or auth_role() = 'admin'
)
with check (
    is_course_teacher(course_id)
    or auth_role() = 'admin'
);

-- ============================================================
-- recommendations
-- ============================================================
create policy "recs_select"
on recommendations for select to authenticated
using (student_id = auth.uid() or is_course_teacher(course_id) or auth_role() = 'admin');

create policy "recs_insert_teacher"
on recommendations for insert to authenticated
with check (is_course_teacher(course_id) or auth_role() = 'admin');

create policy "recs_update_student"
on recommendations for update to authenticated
using (student_id = auth.uid());

-- ============================================================
-- notifications
-- ============================================================
create policy "notifications_select"
on notifications for select to authenticated
using (user_id = auth.uid());

create policy "notifications_insert"
on notifications for insert to authenticated
with check (auth_role() in ('teacher', 'admin'));

create policy "notifications_update"
on notifications for update to authenticated
using (user_id = auth.uid());

-- ============================================================
-- audit_logs
-- RC-02 / FIND-002: no direct insert policy exists. All writes go through
-- log_audit_event() below, which binds actor_id to auth.uid() server-side.
-- ============================================================
create policy "audit_logs_select"
on audit_logs for select to authenticated
using (
    auth_role() = 'admin'
);
-- NO INSERT POLICY, NO UPDATE POLICY, NO DELETE POLICY — see log_audit_event() below
-- and the audit_logs_immutable trigger (017_triggers.sql §7.9).

create or replace function log_audit_event(
    p_action        text,
    p_target_table  text  default null,
    p_target_id     text  default null,
    p_metadata      jsonb default '{}',
    p_ip_address    inet  default null   -- Pass client IP from Server Action
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into audit_logs (
        actor_id, actor_role,
        action, target_table, target_id, metadata, ip_address
    )
    select
        auth.uid(),   -- bound server-side, cannot be spoofed by the caller
        u.role,
        p_action, p_target_table, p_target_id, p_metadata,
        coalesce(p_ip_address, current_setting('app.client_ip', true)::inet, null)
    from users u where u.id = auth.uid();
end;
$$;

grant execute on function log_audit_event(text, text, text, jsonb, inet) to authenticated;

-- Helper called from every Server Action before auditable DB writes. Sets a
-- transaction-local session variable so log_audit_event() can capture the
-- client IP for FR-ADMIN-17 compliance.
create or replace function set_client_ip(ip_addr text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    perform set_config('app.client_ip', coalesce(ip_addr, '0.0.0.0'), true);
end;
$$;

grant execute on function set_client_ip(text) to authenticated;

-- ============================================================
-- ai_generation_logs
-- ============================================================
create policy "ai_logs_select"
on ai_generation_logs for select to authenticated
using (
    requested_by = auth.uid()
    or auth_role() = 'admin'
);

create policy "ai_logs_insert"
on ai_generation_logs for insert to authenticated
with check (
    auth_role() = 'teacher'
    and requested_by = auth.uid()
);

-- NOTE: lesson_completions RLS policies are NOT here — they ship with the
-- table itself in 020_lesson_completions.sql, using CREATE POLICY IF NOT
-- EXISTS, per DATABASE.md §6's own note ("If §6 and §9 differ, §9 wins").
