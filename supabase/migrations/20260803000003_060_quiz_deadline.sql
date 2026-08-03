-- 060: Quiz deadline ("due by" time), reusing available_until
--
-- Explicit request: quizzes need a deadline, same shape as assignments'
-- allow_late pattern (a single "due by" time, not a full open/close
-- window), with the same teacher-controlled override — and, the one
-- place this differs from assignments: once the deadline passes, an
-- ALREADY-IN-PROGRESS attempt should be cut off the same way the
-- per-attempt timer (time_limit_minutes) already cuts one off, not just
-- block starting new attempts.
--
-- available_until already existed on `quizzes` but was never wired up
-- anywhere in application code (confirmed 2026-08-03 — no teacher-facing
-- UI existed, and createDraftQuiz/createQuiz never set it). This
-- migration is what actually activates it, reusing the column rather
-- than adding a new one. quizzes.allow_late is new — quizzes never had
-- an equivalent column before now, unlike assignments.

alter table public.quizzes
  add column if not exists allow_late boolean not null default false;

-- Extends the existing timer-expiry trigger (migration 017,
-- prevent_response_after_expiry) to ALSO treat "past available_until
-- with allow_late = false" as an expiry condition. Same trigger, same
-- enforcement point (autosave writes to quiz_responses) — a deadline
-- cuts off an in-progress attempt exactly the way the timer already
-- does, per explicit request, rather than inventing a second, parallel
-- mechanism that could disagree with the first one.
create or replace function public.prevent_response_after_expiry()
returns trigger language plpgsql as $$
declare
    v_started_at      timestamptz;
    v_time_limit_min  integer;
    v_status          text;
    v_available_until timestamptz;
    v_allow_late      boolean;
begin
    select a.started_at, a.status, q.time_limit_minutes, q.available_until, q.allow_late
    into   v_started_at, v_status, v_time_limit_min, v_available_until, v_allow_late
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

    if v_available_until is not null and not v_allow_late then
        if now() > v_available_until then
            raise exception 'This quiz''s deadline has passed. No further responses accepted.'
                using errcode = 'P0001';
        end if;
    end if;

    return new;
end;
$$;

-- No DROP/CREATE TRIGGER needed — trg_prevent_late_response (migration
-- 017) is bound to this function by name, so CREATE OR REPLACE FUNCTION
-- alone updates its behavior. Same pattern already used elsewhere in
-- this project's migration history (e.g. check_max_attempts() gaining
-- retake-bypass logic via a later CREATE OR REPLACE, per that
-- function's own migration-017 comment).
