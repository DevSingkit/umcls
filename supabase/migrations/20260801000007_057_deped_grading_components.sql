-- 057_deped_grading_components.sql
--
-- Adds DepEd Matatag grading support for Grades 1-6 (Kindergarten uses
-- a separate rating-scale system, intentionally out of scope here).
--
-- Two additions:
--   1. grading_component on assignments and quizzes — tags each item as
--      written_work | performance_task | quarterly_assessment, set once
--      at creation, required (not nullable) so nothing can end up
--      uncategorized and silently excluded from grade computation.
--   2. subject_weight_profiles — a small lookup table, not hardcoded
--      logic, so weight changes are a data edit, not a redeploy. Two
--      rows seeded: 'default' (20/50/30) and 'mapeh' (20/60/20), per
--      the DepEd weight tables for Grades 1-3 and 4-6 (identical
--      percentages in both grade bands, confirmed from the source
--      document).
--
-- Deliberately does NOT touch the `grades` table (still dead, per
-- DATABASE.md — no write path, and this migration doesn't add one).
-- Final grade computation stays live/computed-on-read, same pattern
-- gradebook.ts already uses for assignment/quiz averages — see
-- features/grades/queries/gradebook.ts for where this gets consumed.

create type grading_component_type as enum (
    'written_work',
    'performance_task',
    'quarterly_assessment'
);

alter table assignments
    add column grading_component grading_component_type not null default 'performance_task';

alter table quizzes
    add column grading_component grading_component_type not null default 'quarterly_assessment';

-- Defaults above exist only so this migration doesn't fail against
-- existing rows created before this feature. Every *new* assignment/quiz
-- must set this explicitly at creation via the required form dropdown —
-- application code should never rely on these column defaults the way
-- migration 054's assignments.is_published default was relied on and
-- caused a real bug (see HANDOFF.md / CHANGELOG.md). Existing rows that
-- got the default here should be reviewed and re-tagged by the teacher
-- once this feature ships, not treated as correctly categorized.
comment on column assignments.grading_component is
    'DepEd component this assignment counts toward: written_work, performance_task, or quarterly_assessment. Required at creation — the column default exists only to satisfy pre-existing rows and must not be relied on by application code.';
comment on column quizzes.grading_component is
    'DepEd component this quiz counts toward: written_work, performance_task, or quarterly_assessment. Required at creation — the column default exists only to satisfy pre-existing rows and must not be relied on by application code.';

create table subject_weight_profiles (
    id uuid primary key default gen_random_uuid(),
    profile_key text not null unique, -- 'default' | 'mapeh' | future exceptions
    written_work_pct numeric not null,
    performance_task_pct numeric not null,
    quarterly_assessment_pct numeric not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint subject_weight_profiles_pct_sum_check
        check (written_work_pct + performance_task_pct + quarterly_assessment_pct = 100)
);

comment on table subject_weight_profiles is
    'DepEd Matatag component weights per subject profile, Grades 1-6. courses.subject determines which profile applies (see get-subject-weight-profile.ts) — matching is done in application code via a small subject-name -> profile_key map, not a direct foreign key, since courses.subject is free text.';

insert into subject_weight_profiles (profile_key, written_work_pct, performance_task_pct, quarterly_assessment_pct)
values
    ('default', 20, 50, 30), -- Filipino, English, CLE, EPP, Math, Science, AP
    ('mapeh', 20, 60, 20);

-- RLS: read-only reference data, safe for any authenticated user to
-- read (needed by both teacher gradebook and student grade views).
-- No insert/update/delete policy for any role — profile changes are an
-- admin/db-level operation only, not exposed through the app, same
-- posture as other seed/reference tables in this schema.
alter table subject_weight_profiles enable row level security;

create policy subject_weight_profiles_select_all
    on subject_weight_profiles for select
    to authenticated
    using (true);
