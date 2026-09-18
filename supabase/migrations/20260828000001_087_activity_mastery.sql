-- 20260828000001_087_activity_mastery.sql
-- Phase 1 of the adaptive-engine track (see ADAPTIVE-ENGINE-PLAN.md,
-- ADAPTIVE-ENGINE-LOG.md 2026-08-28 Phase 0 entry for the locked
-- streak-based model this implements).
--
-- Per-student, per-activity mastery state. mission_progress (082)
-- already tracks mastery at the whole-mission level; this is the same
-- idea one level down, at the individual question level, which does
-- not exist anywhere yet.
--
-- Deliberately NOT day/calendar-based (no box_number, no
-- next_review_at) — Phase 0 scrapped the original Leitner-box draft
-- because this app's usage pattern (irregular, parent-guided access,
-- not daily homework) doesn't fit a "review in N days" schedule.
-- Mastery here is purely streak-based: 3 correct in a row = mastered,
-- any wrong answer resets to 0.

-- ============================================================
-- Table
-- ============================================================

create table public.activity_mastery (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  activity_id uuid not null,
  state text not null default 'new'
    check (state = any (array['new'::text, 'learning'::text, 'mastered'::text])),
  correct_streak integer not null default 0,
  wrong_count integer not null default 0,
  hint_uses integer not null default 0,
  last_seen_at timestamp with time zone,
  mastered_at timestamp with time zone,
  updated_at timestamp with time zone not null default now(),
  constraint activity_mastery_pkey primary key (id),
  constraint activity_mastery_student_id_fkey foreign key (student_id) references public.users(id),
  constraint activity_mastery_activity_id_fkey foreign key (activity_id) references public.activities(id),
  constraint activity_mastery_unique unique (student_id, activity_id)
);

create index idx_activity_mastery_student on public.activity_mastery(student_id);
create index idx_activity_mastery_activity on public.activity_mastery(activity_id);

-- ============================================================
-- RLS: activity_mastery
-- Mirrors mission_progress's (082) posture exactly: a student sees
-- their own rows, a teacher/admin sees rows for students in their own
-- courses, and there is NO direct insert/update policy for
-- `authenticated`. This is a computed/derived table (streak state
-- advanced by server-side attempt-handling logic, Phase 2), not a raw
-- student-submitted log like attempt_events — so, same as
-- mission_progress, writes go through the service-role client from a
-- Server Action, not directly from the client.
-- ============================================================

alter table activity_mastery enable row level security;

create policy "activity_mastery_select"
on activity_mastery for select to authenticated
using (
    student_id = auth.uid()
    or is_course_teacher((
        select l.course_id from activities a
        join missions m on m.id = a.mission_id
        join lessons l on l.id = m.lesson_id
        where a.id = activity_id
    ))
    or auth_role() = 'admin'
);
-- NO direct insert/update policy for `authenticated` — rows are
-- written by the attempt-submission Server Action using the
-- service-role client (features/missions/actions/submit-activity-
-- attempt.ts, Phase 2), same posture as mission_progress.
