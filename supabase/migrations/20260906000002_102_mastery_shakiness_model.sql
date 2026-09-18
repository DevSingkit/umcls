-- 20260906000002_102_mastery_shakiness_model.sql
-- Thesis ML component: "A machine learning component, designed and
-- built using logistic regression, intended to flag students whose
-- mastered status may still be shaky based on patterns in their
-- mission activity, such as heavy hint use or a long gap since their
-- last practice." — per the thesis paper's own wording. This is the
-- schema for that component: a single learned model (mastery_shakiness_model)
-- and a table capturing the exact feature values at the moment a
-- question was mastered (mastery_shakiness_snapshots), so the model
-- can later be trained on what actually happened.
--
-- WHY A SNAPSHOT TABLE, NOT JUST READING question_mastery LIVE:
-- question_mastery's hint_uses/wrong_count columns keep growing after
-- mastery is reached (a replay, a later mastered-mission review, etc.
-- could still touch them in principle). To train correctly, the model
-- needs the values AS THEY WERE at the exact moment mastery was
-- reached — not whatever they've drifted to by the time we find out
-- whether that mastery held up. So the values are frozen here the
-- instant question_mastery.state flips to 'mastered', and read back
-- from THIS table (never re-queried from question_mastery) when
-- training happens later.
--
-- V1 SIMPLIFICATION, STATED PLAINLY: this only trains on the "turned
-- out shaky" outcome — a real subsequent wrong answer on a question
-- that was previously mastered. It does NOT train on a "confirmed
-- solid" outcome (e.g. "N days passed with no wrong answer, count it
-- as solid") — deciding what counts as "confirmed solid" is a real
-- design question of its own that isn't settled yet. This means, for
-- now, the model only ever learns from failures, not from successes.
-- Honest limitation, not a hidden shortcut — worth stating exactly
-- this way if asked about it.
--
-- SINGLE SHARED MODEL, NOT ONE PER QUESTION OR PER STUDENT: a small
-- school does not have remotely enough attempts per individual
-- question to train a separate model per question. One global model,
-- learning from every student's every question, is the only choice
-- that has any chance of a meaningful sample size at this scale.
--
-- FEATURE NAMING: hint_uses and wrong_count are RAW COUNTS, not
-- normalized rates — no "rate" language used anywhere here or in the
-- application code that reads this, to avoid implying a normalization
-- step that isn't actually being done.

-- ─── mastery_shakiness_model ────────────────────────────────────────
-- Singleton table — exactly one row, id always 1. The model's entire
-- learned state: 3 feature weights + 1 intercept, all starting at 0
-- (an untrained model predicts 50% shaky for everyone until it's seen
-- real outcomes — expected and correct, not a bug).
create table public.mastery_shakiness_model (
  id smallint primary key default 1,
  weight_hint_uses double precision not null default 0,
  weight_days_since_practice double precision not null default 0,
  weight_wrong_count double precision not null default 0,
  intercept double precision not null default 0,
  training_examples integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  constraint mastery_shakiness_model_singleton check (id = 1)
);

insert into public.mastery_shakiness_model (id) values (1);

-- No RLS policies for `authenticated` at all — this is a purely
-- internal engine table, never read or written directly by a client.
-- All access goes through the service-role client in
-- submit-question-attempt.ts, same posture as question_mastery having
-- no direct write policy.
alter table public.mastery_shakiness_model enable row level security;

-- ─── mastery_shakiness_snapshots ────────────────────────────────────
create table public.mastery_shakiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id),
  question_id uuid not null references public.activity_questions(id),
  hint_uses integer not null,
  wrong_count integer not null,
  days_since_practice double precision not null,
  predicted_shaky_probability double precision not null,
  status text not null default 'pending'
    check (status = any (array['pending'::text, 'confirmed_shaky'::text])),
  mastered_at timestamp with time zone not null default now(),
  resolved_at timestamp with time zone
);

create index idx_mastery_shakiness_snapshots_pending
  on public.mastery_shakiness_snapshots (student_id, question_id)
  where status = 'pending';

alter table public.mastery_shakiness_snapshots enable row level security;

-- Teacher-facing SELECT only — this is diagnostic information FOR THE
-- TEACHER (per this session's explicit design decision: the student's
-- own dashboard/mastered-status display is untouched by this feature
-- entirely). Mirrors migration 096's is_course_teacher()/auth_role()
-- pattern exactly, one level deeper (question -> activity -> mission
-- -> lesson -> course) same as activity_questions' own policies.
create policy "mastery_shakiness_snapshots_select_teacher"
on public.mastery_shakiness_snapshots for select to authenticated
using (
    is_course_teacher((
        select l.course_id from public.activity_questions q
        join public.activities a on a.id = q.activity_id
        join public.missions m on m.id = a.mission_id
        join public.lessons l on l.id = m.lesson_id
        where q.id = mastery_shakiness_snapshots.question_id
    ))
    or auth_role() = 'admin'
);

-- No student SELECT policy at all — deliberate, matches the design
-- decision that this flag is teacher-facing only, not shown to the
-- student whose mastery it's assessing.
-- No INSERT/UPDATE policy for `authenticated` at all — every write
-- goes through the service-role client in submit-question-attempt.ts,
-- same posture as question_mastery.
