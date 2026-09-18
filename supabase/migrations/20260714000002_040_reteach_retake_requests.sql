-- 20260714000002_040_reteach_retake_requests.sql
-- Creates reteach_retake_requests (database.md §11.8) and updates
-- check_max_attempts() to grant exactly one bypass attempt per approved,
-- unconsumed request. Did not exist in the live DB before this migration
-- (confirmed via live schema dump, 2026-07-14). Required for PH9-007.
--
-- Idempotent: DROP POLICY IF EXISTS before every CREATE POLICY, since
-- plain PostgreSQL has no CREATE POLICY IF NOT EXISTS clause. Safe to
-- rerun this whole file if a previous attempt partially applied.
--
-- Note: this migration assumes check_max_attempts() already exists as a
-- trigger function on quiz_attempts (per PH4-001's "concurrent attempt-start
-- confirmed correct" verification). CREATE OR REPLACE is used so this is
-- safe whether or not the exact prior definition matches database.md §7.7
-- word-for-word — if your existing function has diverged, this migration
-- will overwrite it with the version below.

create table if not exists reteach_retake_requests (
    id                 uuid primary key default gen_random_uuid(),
    reteach_lesson_id  uuid not null references reteach_lessons(id) on delete cascade,
    quiz_id            uuid not null references quizzes(id) on delete cascade,
    student_id         uuid not null references users(id) on delete cascade,
    status             text not null default 'pending'
                           check (status in ('pending', 'approved', 'denied')),
    requested_at       timestamptz not null default now(),
    decided_by         uuid references users(id),
    decided_at         timestamptz,
    consumed_at        timestamptz,
    constraint reteach_retake_unique unique (reteach_lesson_id, student_id)
);

create index if not exists idx_retake_requests_student on reteach_retake_requests(student_id);
create index if not exists idx_retake_requests_quiz    on reteach_retake_requests(quiz_id);
create index if not exists idx_retake_requests_status  on reteach_retake_requests(status);

alter table reteach_retake_requests enable row level security;

drop policy if exists "retake_select_own" on reteach_retake_requests;
create policy "retake_select_own"
on reteach_retake_requests for select to authenticated
using (
    student_id = auth.uid()
    or is_course_teacher((select q.course_id from quizzes q where q.id = quiz_id))
    or auth_role() = 'admin'
);

drop policy if exists "retake_insert_student" on reteach_retake_requests;
create policy "retake_insert_student"
on reteach_retake_requests for insert to authenticated
with check (
    student_id = auth.uid()
    and auth_role() = 'student'
    and exists (
        select 1 from reteach_lessons rl
        where rl.id = reteach_lesson_id
          and rl.is_published = true
          and rl.quiz_id = reteach_retake_requests.quiz_id
    )
);

drop policy if exists "retake_update_teacher" on reteach_retake_requests;
create policy "retake_update_teacher"
on reteach_retake_requests for update to authenticated
using (
    is_course_teacher((select q.course_id from quizzes q where q.id = quiz_id))
)
with check (
    is_course_teacher((select q.course_id from quizzes q where q.id = quiz_id))
);

-- No DELETE policy — requests are a permanent record of the decision.

-- Updated check_max_attempts(): honors exactly one approved, unconsumed
-- retake request as a bypass of max_attempts, then marks it consumed so
-- it can't grant a second extra attempt.
create or replace function check_max_attempts()
returns trigger language plpgsql as $$
declare
    v_max_attempts  integer;
    v_current_count integer;
    v_retake_id     uuid;
begin
    select max_attempts into v_max_attempts
    from quizzes where id = new.quiz_id
    for update;

    select count(*) into v_current_count
    from quiz_attempts
    where quiz_id    = new.quiz_id
      and student_id = new.student_id
      and status    != 'abandoned';

    if v_current_count >= v_max_attempts then
        select id into v_retake_id
        from reteach_retake_requests
        where quiz_id    = new.quiz_id
          and student_id = new.student_id
          and status     = 'approved'
          and consumed_at is null
        for update
        limit 1;

        if v_retake_id is null then
            raise exception 'Maximum quiz attempts reached. Allowed: %, Used: %.',
                v_max_attempts, v_current_count
                using errcode = 'P0001';
        end if;

        update reteach_retake_requests
        set consumed_at = now()
        where id = v_retake_id;
    end if;

    new.attempt_number := v_current_count + 1;
    return new;
end;
$$;
