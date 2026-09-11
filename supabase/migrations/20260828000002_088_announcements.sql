-- 20260828000002_088_announcements.sql
-- Phase 3.8 (ADAPTIVE-ENGINE-PLAN.md): Google Classroom-style
-- announcements, confirmed with user before building. Confirmed first
-- that no shared "stream_items" table exists anywhere in the schema —
-- delete-stream-item.ts (checked before assuming) is just a
-- dispatcher across three SEPARATE per-type RPCs (delete_lesson,
-- delete_quiz, delete_assignment from migration 048); the "stream" is
-- purely a runtime merge of lessons/quizzes/assignments, never its own
-- table. So this needs real new schema, not an extension of anything
-- existing.
--
-- announcement_comments mirrors lesson_comments (migration 027)
-- EXACTLY — same column shape, same 4-policy structure (teacher
-- manage-all / students read / students insert-own / authors
-- delete-own-via-update) — confirmed as the right pattern to copy
-- rather than inventing a new comment shape, per user's explicit
-- "yes, same as lessons" answer.
--
-- announcements itself is simpler than lesson_comments: only a
-- teacher ever creates one (students read + comment, never post an
-- announcement itself), so it gets only 2 policies, not lesson_
-- comments' 4 — no "students insert" policy, no separate "authors
-- delete own" policy (the single teacher-manage-all policy already
-- covers a teacher deleting their own course's announcements, same
-- as lesson_comments' teacher-moderation policy already covers
-- teachers deleting any comment on their own lesson). Deliberately
-- NOT using the migration-048-style SECURITY DEFINER RPC workaround
-- for deletion — that workaround exists because lessons/quizzes/
-- assignments' specific *_update RLS policies have a documented WITH
-- CHECK bug (migration 036/048's own comments). lesson_comments'
-- plain-UPDATE-based soft delete works fine with no such workaround,
-- and announcements is the same shape of table (a "post" row with a
-- straightforward owner-scoped policy), so it follows lesson_comments'
-- working precedent, not the buggy one.

create table public.announcements (
  id uuid not null default gen_random_uuid(),
  course_id uuid not null,
  author_id uuid not null,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  constraint announcements_pkey primary key (id),
  constraint announcements_course_id_fkey foreign key (course_id) references public.courses(id),
  constraint announcements_author_id_fkey foreign key (author_id) references public.users(id)
);

create index announcements_course_id_idx on public.announcements (course_id, created_at);

alter table public.announcements enable row level security;

-- Teacher who owns the course can read/insert/update(soft-delete) any
-- announcement on it — the only path to creating one at all.
create policy "Teachers manage announcements on their own courses"
on public.announcements for all
using (
  exists (
    select 1 from public.courses c
    where c.id = announcements.course_id
    and c.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.courses c
    where c.id = announcements.course_id
    and c.teacher_id = auth.uid()
  )
);

-- Enrolled students can read announcements for their own courses.
create policy "Enrolled students read announcements"
on public.announcements for select
using (
  exists (
    select 1 from public.enrollments e
    where e.course_id = announcements.course_id
    and e.student_id = auth.uid()
    and e.status = 'active'
  )
);

-- announcement_comments — structurally identical to lesson_comments,
-- scoped to announcement_id instead of lesson_id, ownership derived
-- via announcements -> courses instead of lessons -> courses.
create table public.announcement_comments (
  id uuid not null default gen_random_uuid(),
  announcement_id uuid not null,
  author_id uuid not null,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  constraint announcement_comments_pkey primary key (id),
  constraint announcement_comments_announcement_id_fkey foreign key (announcement_id) references public.announcements(id),
  constraint announcement_comments_author_id_fkey foreign key (author_id) references public.users(id)
);

create index announcement_comments_announcement_id_idx on public.announcement_comments (announcement_id, created_at);

alter table public.announcement_comments enable row level security;

create policy "Teachers manage comments on their own announcements"
on public.announcement_comments for all
using (
  exists (
    select 1 from public.announcements a
    join public.courses c on c.id = a.course_id
    where a.id = announcement_comments.announcement_id
    and c.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.announcements a
    join public.courses c on c.id = a.course_id
    where a.id = announcement_comments.announcement_id
    and c.teacher_id = auth.uid()
  )
);

create policy "Enrolled students read announcement comments"
on public.announcement_comments for select
using (
  exists (
    select 1 from public.announcements a
    join public.enrollments e on e.course_id = a.course_id
    where a.id = announcement_comments.announcement_id
    and e.student_id = auth.uid()
    and e.status = 'active'
  )
);

create policy "Enrolled students post announcement comments"
on public.announcement_comments for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.announcements a
    join public.enrollments e on e.course_id = a.course_id
    where a.id = announcement_comments.announcement_id
    and e.student_id = auth.uid()
    and e.status = 'active'
  )
);

create policy "Authors delete their own announcement comment"
on public.announcement_comments for update
using (author_id = auth.uid())
with check (author_id = auth.uid());
