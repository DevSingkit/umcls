-- 20260803_058_fix_users_self_update_recursion.sql
--
-- Real bug found 2026-08-03: any UPDATE on `users` (including an admin
-- deactivating a DIFFERENT user via users_admin_update) threw
-- "infinite recursion detected in policy for relation users" (42P17).
--
-- Root cause: users_self_update's WITH CHECK (migration 019) ran three
-- inline subqueries directly against `users`:
--
--   role = (select role from users where id = auth.uid())
--
-- Postgres evaluates ALL permissive policies for a given command on a
-- table, not just the one that "applies" to the current row — so even
-- an admin's UPDATE (going through users_admin_update) still has to
-- evaluate users_self_update's WITH CHECK. That subquery runs under
-- the caller's own RLS context, which re-triggers this same table's
-- policies, which contain the same subquery again — infinite loop.
--
-- auth_role() never hit this because it's SECURITY DEFINER: its
-- internal `select role from users where id = auth.uid()` runs as the
-- function owner, bypassing RLS entirely on that inner lookup, so
-- there's nothing to recurse into. The inline subqueries in
-- users_self_update were never given that same escape hatch.
--
-- Fix: move the "what does this user currently look like" lookup into
-- a SECURITY DEFINER helper (same pattern as auth_role()), and have
-- users_self_update call that instead of querying users directly.

create or replace function public.current_user_self_row()
returns table (role text, is_active boolean, email text)
language sql stable security definer
set search_path = public
as $$
    select role, is_active, email from users where id = auth.uid();
$$;

drop policy if exists "users_self_update" on users;

create policy "users_self_update"
on users for update to authenticated
using (id = auth.uid())
with check (
    id        = auth.uid()
    and role      = (select role      from current_user_self_row())
    and is_active = (select is_active from current_user_self_row())
    and email     = (select email     from current_user_self_row())
);

-- users_admin_update (migration 019) is untouched — it never referenced
-- users directly in its own clauses, only auth_role() (already
-- SECURITY DEFINER), so it was never itself a source of recursion, only
-- a trigger for evaluating the broken policy above.
