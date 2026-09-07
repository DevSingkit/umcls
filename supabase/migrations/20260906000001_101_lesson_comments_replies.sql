-- Adds single-level reply support to lesson_comments (Google
-- Classroom style: a reply attaches to a top-level comment, replies
-- themselves are not further repliable — enforced in the UI, not
-- here, same as everywhere else this app keeps that kind of rule
-- client-side).
--
-- Nullable, self-referencing FK: null = top-level comment, non-null =
-- a reply to that comment. ON DELETE CASCADE is a safety net for a
-- real hard delete (comments are normally soft-deleted via
-- deleted_at, which doesn't trigger this) — if a top-level comment
-- ever IS hard-deleted, its replies shouldn't be left pointing at
-- nothing.
alter table public.lesson_comments
  add column parent_comment_id uuid references public.lesson_comments(id) on delete cascade;

create index lesson_comments_parent_comment_id_idx on public.lesson_comments (parent_comment_id);

-- No RLS policy changes needed: the existing insert policies already
-- gate on author_id/enrollment/course-ownership per row regardless of
-- parent_comment_id, and a reply is inserted into this same table via
-- the same postLessonComment path.
