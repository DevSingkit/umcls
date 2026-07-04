-- 20260616_017_triggers.sql
-- Source: DATABASE.md §7 Triggers & Functions (§7.1-§7.10) and §8 Soft Delete Strategy.
--
-- NOT included here (V2/V3, applied later once their tables exist):
--   §7.11 notify_on_quiz_fail() / notify_students_on_reteach_publish()
--     — reference reteach_lessons (migration 023). Ships in migration 029.
--
-- check_max_attempts() below is the ORIGINAL, pre-retake-request version.
-- DATABASE.md §7.7's migration note says explicitly that the version which
-- consults reteach_retake_requests ships as a CREATE OR REPLACE FUNCTION in
-- migration 028 ("not in the original trigger migration"), but only shows
-- the revised version in the text. This file reconstructs the original by
-- removing the retake-bypass branch — reteach_retake_requests does not
-- exist yet at this point in the migration sequence, so referencing it here
-- would fail. Migration 028 (when/if you build the V3 re-teach feature)
-- replaces this function with the retake-aware version.

-- 7.1 Auto-create user profile on signup
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
    insert into users (id, email, full_name, role)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.email),
        coalesce(new.raw_user_meta_data->>'role', 'student')
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();

-- 7.2 Update updated_at automatically
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_users_updated_at
    before update on users
    for each row execute function set_updated_at();

create trigger trg_courses_updated_at
    before update on courses
    for each row execute function set_updated_at();

create trigger trg_lessons_updated_at
    before update on lessons
    for each row execute function set_updated_at();

create trigger trg_assignments_updated_at
    before update on assignments
    for each row execute function set_updated_at();

create trigger trg_quizzes_updated_at
    before update on quizzes
    for each row execute function set_updated_at();

create trigger trg_qbank_updated_at
    before update on question_bank
    for each row execute function set_updated_at();

-- 7.3 Auto-compute quiz score on submission
create or replace function compute_quiz_score()
returns trigger
language plpgsql security definer
as $$
declare
    v_total_points  numeric;
    v_earned_points numeric;
    v_passing_score numeric;
begin
    -- Only run when status changes to 'submitted'
    if new.status = 'submitted' and old.status = 'in_progress' then
        select
            coalesce(sum(q.points), 0),
            coalesce(sum(case when qr.is_correct then q.points else 0 end), 0)
        into v_total_points, v_earned_points
        from quiz_responses qr
        join questions q on q.id = qr.question_id
        where qr.attempt_id = new.id
          and q.question_type in ('multiple_choice_single', 'multiple_choice_multiple', 'true_false', 'checklist');  -- MAJ-11

        select passing_score into v_passing_score
        from quizzes where id = new.quiz_id;

        if v_total_points > 0 then
            new.score := round((v_earned_points / v_total_points) * 100, 2);
            new.is_passing := new.score >= v_passing_score;
            new.graded_at := now();
            new.status := 'graded';
        end if;
    end if;
    return new;
end;
$$;

create trigger trg_compute_quiz_score
    before update on quiz_attempts
    for each row execute function compute_quiz_score();

-- 7.4 Auto-mark submission as late
create or replace function mark_late_submission()
returns trigger
language plpgsql
as $$
begin
    new.is_late := (
        select due_at is not null and now() > due_at
        from assignments where id = new.assignment_id
    );
    return new;
end;
$$;

create trigger trg_mark_late_submission
    before insert on assignment_submissions
    for each row execute function mark_late_submission();

-- 7.5 Auto-send notification on grade return
create or replace function notify_on_grade_return()
returns trigger
language plpgsql security definer
as $$
begin
    if new.status = 'returned' and old.status != 'returned' then
        insert into notifications (user_id, type, title, body, link)
        values (
            new.student_id,
            'assignment_graded',
            'Assignment graded',
            'Your submission has been graded. Tap to view feedback.',
            '/student/assignments/' || new.assignment_id
        );
    end if;
    return new;
end;
$$;

create trigger trg_notify_grade_return
    after update on assignment_submissions
    for each row execute function notify_on_grade_return();

-- 7.6 Prevent enrolling the course teacher as a student (FIND-022)
-- Cross-table CHECK constraints are unreliable in PostgreSQL; enforced via trigger.
create or replace function prevent_teacher_self_enrollment()
returns trigger
language plpgsql
as $$
begin
    if exists (
        select 1 from courses
        where id = new.course_id
          and teacher_id = new.student_id
    ) then
        raise exception 'A teacher cannot be enrolled as a student in their own course.'
            using errcode = 'P0001';
    end if;
    return new;
end;
$$;

create trigger trg_prevent_teacher_self_enrollment
    before insert on enrollments
    for each row execute function prevent_teacher_self_enrollment();

-- 7.7 Enforce max_attempts atomically (FIND-004)
-- ORIGINAL version — no retake-request bypass. See file header note above.
create or replace function check_max_attempts()
returns trigger language plpgsql as $$
declare
    v_max_attempts  integer;
    v_current_count integer;
begin
    select max_attempts into v_max_attempts
    from quizzes where id = new.quiz_id
    for update; -- row lock prevents concurrent inserts from racing

    select count(*) into v_current_count
    from quiz_attempts
    where quiz_id    = new.quiz_id
      and student_id = new.student_id
      and status    != 'abandoned';

    if v_current_count >= v_max_attempts then
        raise exception 'Maximum quiz attempts reached. Allowed: %, Used: %.',
            v_max_attempts, v_current_count
            using errcode = 'P0001';
    end if;

    new.attempt_number := v_current_count + 1;
    return new;
end;
$$;

create trigger trg_check_max_attempts
    before insert on quiz_attempts
    for each row execute function check_max_attempts();

-- 7.8 Block quiz_responses writes after timer expiry (FIND-006)
create or replace function prevent_response_after_expiry()
returns trigger language plpgsql as $$
declare
    v_started_at     timestamptz;
    v_time_limit_min integer;
    v_status         text;
begin
    select a.started_at, a.status, q.time_limit_minutes
    into   v_started_at, v_status, v_time_limit_min
    from quiz_attempts a
    join quizzes q on q.id = a.quiz_id
    where a.id = new.attempt_id;

    if v_status != 'in_progress' then
        raise exception 'Attempt is not in progress (%). Responses cannot be modified.', v_status
            using errcode = 'P0001';
    end if;

    if v_time_limit_min is not null then
        if now() > v_started_at + (v_time_limit_min || ' minutes')::interval then
            raise exception 'Quiz time limit has expired. No further responses accepted.'
                using errcode = 'P0001';
        end if;
    end if;

    return new;
end;
$$;

create trigger trg_prevent_late_response
    before insert or update on quiz_responses
    for each row execute function prevent_response_after_expiry();

-- 7.9 Immutable audit_logs
-- C-06: blocks UPDATE/DELETE by default; the monthly retention archival job
-- (SECURITY.md §11.3) legitimately hard-deletes rows older than 13 months
-- via archive_delete_audit_logs(), which sets a session-local flag first.
create or replace function prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
    if current_setting('app.audit_archival_in_progress', true) = 'true' then
        return coalesce(new, old);
    end if;
    raise exception 'audit_logs are immutable. No updates or deletes allowed.';
end;
$$;

create trigger audit_logs_immutable
before update or delete on audit_logs
for each row execute function prevent_audit_log_mutation();

create or replace function archive_delete_audit_logs(cutoff timestamptz)
returns integer
language plpgsql
security definer
as $$
declare
    deleted_count integer;
begin
    perform set_config('app.audit_archival_in_progress', 'true', true);
    delete from audit_logs where created_at < cutoff;
    get diagnostics deleted_count = row_count;
    return deleted_count;
end;
$$;

revoke execute on function archive_delete_audit_logs(timestamptz) from public, authenticated;
grant execute on function archive_delete_audit_logs(timestamptz) to service_role;

-- 7.10 Validate assignment submission score — already created in
-- 016_constraints.sql (trg_check_submission_score). Listed there per
-- DATABASE.md §5/§7.10 cross-reference; not duplicated here.

-- §8 Soft Delete Strategy — cascade course soft-delete to children
create or replace function cascade_course_soft_delete()
returns trigger
language plpgsql
as $$
begin
    if new.deleted_at is not null and old.deleted_at is null then
        update lessons     set deleted_at = now() where course_id = new.id and deleted_at is null;
        update assignments set deleted_at = now() where course_id = new.id and deleted_at is null;
        update quizzes     set deleted_at = now() where course_id = new.id and deleted_at is null;
    end if;
    return new;
end;
$$;

create trigger trg_cascade_course_soft_delete
    after update on courses
    for each row when (new.deleted_at is not null and old.deleted_at is null)
    execute function cascade_course_soft_delete();
