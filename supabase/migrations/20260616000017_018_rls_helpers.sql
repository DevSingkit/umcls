-- 20260616_018_rls_helpers.sql
-- Source: DATABASE.md §6 Supabase RLS Policies — "Enable RLS" block + Helper Functions.
-- tasks.md PH0-004 RC-checks reference this file by number: both auth_role()
-- and is_enrolled()/is_course_teacher() must be VOLATILE-checked (RC-04 for
-- auth_role) and defined here.

-- Enable RLS on all tables. Anonymous users have zero access.
alter table users                   enable row level security;
alter table courses                 enable row level security;
alter table enrollments             enable row level security;
alter table lessons                 enable row level security;
alter table materials               enable row level security;
alter table assignments             enable row level security;
alter table assignment_submissions  enable row level security;
alter table quizzes                 enable row level security;
alter table question_bank           enable row level security;
alter table questions               enable row level security;
alter table answer_options          enable row level security;
alter table quiz_attempts           enable row level security;
alter table quiz_responses          enable row level security;
alter table grades                  enable row level security;
alter table mastery_records         enable row level security;
alter table recommendations         enable row level security;
alter table notifications           enable row level security;
alter table ai_generation_logs      enable row level security;
alter table audit_logs              enable row level security;
-- lesson_completions RLS is enabled in its own migration (020_lesson_completions.sql).
-- reteach_lessons / student_activity_events RLS ships with those V2/V3 tables
-- (migrations 023/024, policies in §11.3a/§11.4a) — not here.

-- RC-04 / FIND-003: auth_role() is VOLATILE, not STABLE, to prevent
-- PostgreSQL from caching its result within a transaction. STABLE would let
-- a role value read at transaction start persist even after a concurrent
-- admin change, enabling privilege escalation.
create or replace function auth_role()
returns text
language sql volatile security definer
set search_path = public
as $$
    select role from users where id = auth.uid();
$$;

-- Returns true if the current user is enrolled in a given course
create or replace function is_enrolled(p_course_id uuid)
returns boolean
language sql stable security definer
as $$
    select exists (
        select 1 from enrollments
        where course_id = p_course_id
          and student_id = auth.uid()
          and status = 'active'
    );
$$;

-- Returns true if the current user teaches a given course
create or replace function is_course_teacher(p_course_id uuid)
returns boolean
language sql stable security definer
as $$
    select exists (
        select 1 from courses
        where id = p_course_id
          and teacher_id = auth.uid()
    );
$$;
