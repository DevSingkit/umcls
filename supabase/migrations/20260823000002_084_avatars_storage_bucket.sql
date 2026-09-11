-- 20260823000002_084_avatars_storage_bucket.sql
--
-- Public avatar photo storage (revised 2026-08-23 — public chosen so
-- every user's photo is visible wherever it's shown, including
-- classmates in the People tab). Every file gets a permanent public
-- URL once uploaded; there is no login check on viewing a photo.
--
-- Path convention: avatars/{user_id}/{uuid}-{filename} — same
-- owner-folder pattern submissions.ts already uses.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Public bucket still needs a SELECT policy for the bucket's own
-- listing/metadata operations to work correctly through the client
-- library, even though object bytes are servable via the public URL
-- regardless. Harmless to also allow it explicitly.
create policy avatars_select_public on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

-- Write access stays owner-only: the first path segment must equal
-- the calling user's own id.
create policy avatars_insert_own on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update_own on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_delete_own on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Adds avatar_url to get_classmates() (migration 030). Postgres
-- cannot CREATE OR REPLACE a function when the return row shape
-- changes (adding avatar_url to RETURNS TABLE is exactly that) — it
-- must be dropped first, hence the explicit DROP below. This is the
-- fix for SQLSTATE 42P13 ("cannot change return type of existing
-- function... Row type defined by OUT parameters is different").
--
-- WHERE/JOIN logic is unchanged from the original — only the SELECT
-- list and return type gained avatar_url.
DROP FUNCTION IF EXISTS public.get_classmates(uuid);

CREATE FUNCTION public.get_classmates(p_course_id uuid)
RETURNS TABLE (id uuid, full_name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.full_name, u.avatar_url
  FROM enrollments e
  JOIN users u ON u.id = e.student_id
  JOIN courses c ON c.id = e.course_id
  WHERE e.course_id = p_course_id
    AND e.status = 'active'
    AND c.show_classmates = true
    AND EXISTS (
      SELECT 1 FROM enrollments me
      WHERE me.course_id = p_course_id
        AND me.student_id = auth.uid()
        AND me.status = 'active'
    );
$$;
