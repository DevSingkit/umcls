-- 20260616_020_lesson_completions.sql
-- Adds lesson_completions table, indexes, RLS enable, and RLS policies.
-- Must run after 20260616_019_rls_policies.sql (depends on auth_role,
-- is_enrolled helpers from migration 018).
-- Source: DATABASE.md §9 (the authoritative, runnable version of §3.21 / §6).

create table if not exists lesson_completions (
    id           uuid primary key default gen_random_uuid(),
    lesson_id    uuid not null references lessons(id) on delete cascade,
    student_id   uuid not null references users(id) on delete cascade,
    completed_at timestamptz not null default now(),
    constraint lesson_completions_unique unique (lesson_id, student_id)
);

-- NOTE (M-08): no separate `create unique index` here — the UNIQUE constraint
-- above already creates an implicit unique index on (lesson_id, student_id).
create index if not exists idx_completions_student on lesson_completions(student_id);
create index if not exists idx_completions_lesson  on lesson_completions(lesson_id);

alter table lesson_completions enable row level security;

create policy if not exists "completions_insert_student"
on lesson_completions for insert to authenticated
with check (
    auth_role() = 'student'
    and student_id = auth.uid()
    and is_enrolled((select course_id from lessons where id = lesson_id))
    and exists (select 1 from lessons where id = lesson_id and is_published = true)
);

create policy if not exists "completions_select"
on lesson_completions for select to authenticated
using (
    student_id = auth.uid()
    or is_course_teacher((select course_id from lessons where id = lesson_id))
    or auth_role() = 'admin'
);
-- No UPDATE or DELETE policies: completions are append-only.
