-- 20260822000001_082_missions_activities_attempts.sql
-- Gamified mastery-loop pivot (see LMS_PRD.md pivot header, CHANGELOG.md
-- 2026-08-2X pivot entry, HANDOFF.md "Current focus"). New tables only —
-- gradebook_items/gradebook_scores/subject_weight_profiles left in place
-- untouched, unlinked from nav but not dropped.
--
-- Structurally parallel to quizzes/questions/answer_options/quiz_attempts
-- on purpose, so existing grading/RLS patterns could be mirrored rather
-- than reinvented. RLS section mirrors 019_rls_policies.sql exactly.

-- ============================================================
-- Tables
-- ============================================================

-- One mission = one themed group of activities inside a lesson, shown
-- to students as a node on the lesson's "path."
create table public.missions (
  id uuid not null default gen_random_uuid(),
  lesson_id uuid not null,
  title text not null,
  description text,
  order_index integer not null default 0,
  mastery_threshold integer not null default 3, -- e.g. 3 correct in a row
  is_published boolean not null default true,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  constraint missions_pkey primary key (id),
  constraint missions_lesson_id_fkey foreign key (lesson_id) references public.lessons(id),
  constraint missions_created_by_fkey foreign key (created_by) references public.users(id)
);

-- One activity = one question/task inside a mission. Deliberately
-- shaped like public.questions (same question-type pattern, points,
-- order_index) so existing quiz-grading logic can be adapted rather
-- than rewritten from scratch.
create table public.activities (
  id uuid not null default gen_random_uuid(),
  mission_id uuid not null,
  prompt text not null,
  activity_type text not null default 'multiple_choice_single'
    check (activity_type = any (array['multiple_choice_single'::text, 'true_false'::text, 'short_answer'::text])),
  points numeric not null default 1,
  hint_text text,
  order_index integer not null default 0,
  -- Marks this activity as the "easier" fallback version of another
  -- activity, shown after repeated wrong attempts. Nullable — most
  -- activities have none.
  remediates_activity_id uuid,
  created_at timestamp with time zone not null default now(),
  constraint activities_pkey primary key (id),
  constraint activities_mission_id_fkey foreign key (mission_id) references public.missions(id),
  constraint activities_remediates_fkey foreign key (remediates_activity_id) references public.activities(id)
);

-- Answer options, same shape as answer_options, scoped to activities
-- instead of questions.
create table public.activity_options (
  id uuid not null default gen_random_uuid(),
  activity_id uuid not null,
  option_text text not null,
  is_correct boolean not null default false,
  order_index integer not null default 0,
  constraint activity_options_pkey primary key (id),
  constraint activity_options_activity_id_fkey foreign key (activity_id) references public.activities(id)
);

-- The core new data: every single answer a student gives, correct or
-- not. This is what "observe learning behavior" actually means — not
-- a final score, a full event log. Append-only by design (no update/
-- delete policy below).
create table public.attempt_events (
  id uuid not null default gen_random_uuid(),
  activity_id uuid not null,
  student_id uuid not null,
  attempt_number integer not null default 1,
  is_correct boolean not null,
  hint_shown boolean not null default false,
  selected_option_id uuid,
  text_response text,
  responded_at timestamp with time zone not null default now(),
  constraint attempt_events_pkey primary key (id),
  constraint attempt_events_activity_id_fkey foreign key (activity_id) references public.activities(id),
  constraint attempt_events_student_id_fkey foreign key (student_id) references public.users(id),
  constraint attempt_events_selected_option_id_fkey foreign key (selected_option_id) references public.activity_options(id)
);

-- Per-student progress on each mission: locked until the previous
-- mission is mastered, unlocked while working, mastered once the
-- threshold is hit. Written server-side only (service role) — see RLS
-- notes below, not directly writable by students or teachers yet.
create table public.mission_progress (
  id uuid not null default gen_random_uuid(),
  mission_id uuid not null,
  student_id uuid not null,
  status text not null default 'locked' check (status = any (array['locked'::text, 'unlocked'::text, 'mastered'::text])),
  correct_streak integer not null default 0,
  mastered_at timestamp with time zone,
  updated_at timestamp with time zone not null default now(),
  constraint mission_progress_pkey primary key (id),
  constraint mission_progress_mission_id_fkey foreign key (mission_id) references public.missions(id),
  constraint mission_progress_student_id_fkey foreign key (student_id) references public.users(id),
  constraint mission_progress_unique unique (mission_id, student_id)
);

create index idx_missions_lesson_id on public.missions(lesson_id);
create index idx_activities_mission_id on public.activities(mission_id);
create index idx_activity_options_activity_id on public.activity_options(activity_id);
create index idx_attempt_events_activity_student on public.attempt_events(activity_id, student_id);
create index idx_mission_progress_student on public.mission_progress(student_id);

-- ============================================================
-- RLS: missions, activities, activity_options, attempt_events,
-- mission_progress
-- Mirrors 019_rls_policies.sql's quizzes/questions/answer_options/
-- quiz_attempts pattern exactly. activity_options gets the same
-- masked-view treatment as answer_options (RC-03/FIND-001/C-04) since
-- is_correct must stay hidden from students.
-- ============================================================

alter table missions          enable row level security;
alter table activities        enable row level security;
alter table activity_options  enable row level security;
alter table attempt_events    enable row level security;
alter table mission_progress  enable row level security;

-- ============================================================
-- missions
-- ============================================================
create policy "missions_select_student"
on missions for select to authenticated
using (
    auth_role() = 'student'
    and is_published = true
    and is_enrolled((select course_id from lessons where id = lesson_id))
    and deleted_at is null
);

create policy "missions_select_teacher"
on missions for select to authenticated
using (
    (auth_role() = 'teacher' and is_course_teacher((select course_id from lessons where id = lesson_id)) and deleted_at is null)
    or (auth_role() = 'admin' and deleted_at is null)
);

create policy "missions_insert"
on missions for insert to authenticated
with check (
    auth_role() = 'teacher'
    and is_course_teacher((select course_id from lessons where id = lesson_id))
);

create policy "missions_update"
on missions for update to authenticated
using (
    auth_role() = 'teacher'
    and is_course_teacher((select course_id from lessons where id = lesson_id))
);

-- ============================================================
-- activities & activity_options
-- Same masking pattern as questions/answer_options: direct SELECT on
-- activity_options is revoked from `authenticated`. Students read
-- activity_options_for_student (a security_invoker=false view that
-- omits is_correct). Teachers/admins use the raw table; grading logic
-- uses the service-role client, same as quiz grading.
-- ============================================================
create policy "activities_select_student"
on activities for select to authenticated
using (
    is_enrolled((select l.course_id from missions m join lessons l on l.id = m.lesson_id where m.id = mission_id))
);

create policy "activities_select_teacher"
on activities for select to authenticated
using (
    is_course_teacher((select l.course_id from missions m join lessons l on l.id = m.lesson_id where m.id = mission_id))
    or auth_role() = 'admin'
);

create policy "activities_insert"
on activities for insert to authenticated
with check (
    auth_role() = 'teacher'
    and is_course_teacher((select l.course_id from missions m join lessons l on l.id = m.lesson_id where m.id = mission_id))
);

create policy "activities_update"
on activities for update to authenticated
using (
    auth_role() = 'teacher'
    and is_course_teacher((select l.course_id from missions m join lessons l on l.id = m.lesson_id where m.id = mission_id))
);

-- activity_options: teachers/admins only via direct RLS (is_correct visible here)
create policy "activity_options_select_teacher_admin"
on activity_options for select to authenticated
using (
    is_course_teacher((
        select l.course_id from activity_options ao
        join activities a on a.id = ao.activity_id
        join missions m on m.id = a.mission_id
        join lessons l on l.id = m.lesson_id
        where ao.id = activity_options.id
    ))
    or auth_role() = 'admin'
);

create or replace view activity_options_for_student
with (security_invoker = false) as
    select id, activity_id, option_text, order_index
    from activity_options;
-- is_correct intentionally excluded — same reasoning as answer_options_for_student

revoke select on activity_options from authenticated;
grant  select on activity_options_for_student to authenticated;
grant  select on activity_options to service_role;

create policy "activity_options_insert"
on activity_options for insert to authenticated
with check (
    auth_role() = 'teacher'
    and is_course_teacher((
        select l.course_id from activities a
        join missions m on m.id = a.mission_id
        join lessons l on l.id = m.lesson_id
        where a.id = activity_id
    ))
);

-- ============================================================
-- attempt_events
-- Students write their own attempts only, teachers/admin read-only for
-- their course's students. No update/delete policy for anyone — this
-- is an append-only event log by design, same immutability posture as
-- audit_logs (each answer is a fact, not something to be edited later).
-- ============================================================
create policy "attempt_events_select"
on attempt_events for select to authenticated
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

create policy "attempt_events_insert"
on attempt_events for insert to authenticated
with check (
    auth_role() = 'student'
    and student_id = auth.uid()
    and is_enrolled((
        select l.course_id from activities a
        join missions m on m.id = a.mission_id
        join lessons l on l.id = m.lesson_id
        where a.id = activity_id
    ))
);
-- NO UPDATE POLICY, NO DELETE POLICY — append-only event log.

-- ============================================================
-- mission_progress
-- Student's own row is visible to them; teacher/admin see all rows for
-- their course. Writes go through server-side mastery-check logic
-- (service-role client), not direct student writes — a student should
-- never be able to mark their own mission "mastered" by writing this
-- table directly. Teacher-facing manual override deferred (per request
-- — settings to be added later).
-- ============================================================
create policy "mission_progress_select"
on mission_progress for select to authenticated
using (
    student_id = auth.uid()
    or is_course_teacher((select l.course_id from missions m join lessons l on l.id = m.lesson_id where m.id = mission_id))
    or auth_role() = 'admin'
);
-- NO direct insert/update policy for `authenticated` — rows are written
-- by the mastery-check Server Action using the service-role client
-- (features/missions/actions/check-mission-mastery.ts, Phase 2).