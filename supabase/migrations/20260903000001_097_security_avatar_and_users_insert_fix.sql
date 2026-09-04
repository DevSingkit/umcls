-- 097_security_avatar_and_users_insert_fix.sql
--
-- Fixes two issues found in a security/RLS audit (2026-09-03):
--
-- 1. avatars_select_public allowed ANY unauthenticated visitor to view
--    student/teacher avatar photos, with no login required. Given some
--    users are minors, this is tightened to require a logged-in
--    session — any authenticated user can still see avatars (needed
--    for course rosters, comments, etc), but the public internet can't.
--
-- 2. users_insert_trigger granted the `anon` role an unrestricted
--    INSERT on public.users (with_check = true — no restriction at
--    all). It is not currently exploitable because `anon` has no
--    INSERT grant on public.users today, but a policy this permissive
--    should never be the only thing standing between an unauthenticated
--    request and creating arbitrary rows (including role = 'admin').
--    User creation in this app goes through the admin server action
--    (features/admin/actions/create-user.ts), which uses the Supabase
--    service role — service role bypasses RLS entirely, so it was
--    never relying on this policy to begin with. Dropping it removes
--    the policy rather than trying to narrow it, since nothing in the
--    app's real signup/creation flow needs anon to insert into users
--    directly.
--
-- If your signup flow DOES depend on a client-side anon-key insert
-- into public.users (e.g. a Supabase Auth trigger that expects this
-- policy to exist), do not run the DROP POLICY statement below without
-- first confirming that — check for a `handle_new_user`-style trigger
-- on auth.users and whether it runs as SECURITY DEFINER (which would
-- also bypass RLS and not need this policy either).

-- 1. Avatars: require a logged-in session to view, not the whole internet.
drop policy if exists "avatars_select_public" on storage.objects;

create policy "avatars_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

-- 2. Remove the unrestricted anon insert policy on users.
drop policy if exists "users_insert_trigger" on public.users;

-- Belt-and-suspenders: explicitly revoke INSERT on public.users from
-- anon, so even if a future migration/config change accidentally
-- re-grants it, there is no permissive policy left to exploit.
revoke insert on public.users from anon;
