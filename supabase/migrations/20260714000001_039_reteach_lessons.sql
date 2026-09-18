-- 20260714000001_039_reteach_lessons.sql
-- Creates reteach_lessons (database.md §11.3) — did not exist in the live
-- DB at all before this migration, confirmed via a live schema dump
-- 2026-07-14. Required before PH9-004's route handler or any of
-- features/reteach/actions/*.ts can work.
--
-- Idempotent: uses IF NOT EXISTS everywhere it's supported, and
-- DROP POLICY IF EXISTS before every CREATE POLICY, since plain
-- PostgreSQL has no CREATE POLICY IF NOT EXISTS clause. Safe to rerun
-- this whole file if a previous attempt partially applied.

create table if not exists reteach_lessons (
    id                uuid primary key default gen_random_uuid(),
    source_lesson_id  uuid not null references lessons(id) on delete cascade,
    quiz_id           uuid references quizzes(id) on delete set null,
    created_by        uuid not null references users(id) on delete restrict,
    provider          text not null default 'gemini'
                          check (provider in ('gemini')),
    model             text,
    content           jsonb not null,
    trigger_reason    text not null,
    is_published      boolean not null default false,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    deleted_at        timestamptz
);

create index if not exists idx_reteach_lessons_source on reteach_lessons(source_lesson_id);
create index if not exists idx_reteach_lessons_quiz on reteach_lessons(quiz_id);

-- FR-AI-03: at most one (non-deleted) re-teach version per lesson. Required
-- for the route handler's upsert(... onConflict: 'source_lesson_id') to work.
create unique index if not exists idx_reteach_lessons_one_per_lesson
    on reteach_lessons(source_lesson_id) where deleted_at is null;

alter table reteach_lessons enable row level security;

drop policy if exists "reteach_select_teacher" on reteach_lessons;
create policy "reteach_select_teacher"
on reteach_lessons for select to authenticated
using (
    is_course_teacher(
        (select l.course_id from lessons l where l.id = source_lesson_id)
    )
);

drop policy if exists "reteach_insert_teacher" on reteach_lessons;
create policy "reteach_insert_teacher"
on reteach_lessons for insert to authenticated
with check (
    auth_role() = 'teacher'
    and created_by = auth.uid()
    and is_course_teacher(
        (select l.course_id from lessons l where l.id = source_lesson_id)
    )
);

-- with check included from the start (see SECURITY.md §4.6 for why a
-- missing with check on an UPDATE policy is a real vulnerability class in
-- this schema — this migration ships it correctly the first time).
drop policy if exists "reteach_update_teacher" on reteach_lessons;
create policy "reteach_update_teacher"
on reteach_lessons for update to authenticated
using (
    is_course_teacher(
        (select l.course_id from lessons l where l.id = source_lesson_id)
    )
)
with check (
    is_course_teacher(
        (select l.course_id from lessons l where l.id = source_lesson_id)
    )
);

-- Student SELECT: published, enrolled, AND this specific student failed
-- the linked quiz (score below that quiz's own passing_score via
-- quiz_attempts.is_passing) — not class-wide visibility.
drop policy if exists "reteach_select_student" on reteach_lessons;
create policy "reteach_select_student"
on reteach_lessons for select to authenticated
using (
    auth_role() = 'student'
    and is_published = true
    and deleted_at is null
    and quiz_id is not null
    and is_enrolled(
        (select l.course_id from lessons l where l.id = source_lesson_id)
    )
    and exists (
        select 1
        from quiz_attempts qa
        where qa.quiz_id = reteach_lessons.quiz_id
          and qa.student_id = auth.uid()
          and qa.status = 'graded'
          and qa.is_passing = false
    )
);

-- No DELETE policy — soft-delete only (deleted_at), consistent with the
-- rest of this schema's convention.
