-- 20260707000001_030_classmates_visibility.sql
-- Recreated — original file was lost from the local project folder.
-- Reconstructed from: TASKS.md's 2026-07-06 session note (exact
-- filename, column, and function signature), courses.ts's actual usage
-- of get_classmates() (features/courses/actions/courses.ts —
-- getClassmates calls supabase.rpc('get_classmates', { p_course_id })
-- and expects { id, full_name }[] back), and DATABASE.md §users RLS
-- (users_select_scoped, ~line 866) confirming students have NO select
-- access to other students' profiles under normal RLS — a student can
-- only ever see their own row. That's the exact gap this migration
-- exists to bridge, deliberately and narrowly: name-only, nothing else
-- from the users table, and only for classmates in a shared,
-- classmates-enabled course — not a general loosening of who a student
-- can see.
--
-- Filename note: this was originally saved under a timestamp
-- (20260706000004) that collides with the already-applied
-- 20260706000004_026_materials_external_links.sql. Renamed to
-- 20260707000001 to match the filename DATABASE.md already cites
-- ("See migration 20260707000001_030_classmates_visibility.sql") and
-- to sit correctly between 029 (20260706000007) and 031
-- (20260707000002) in migration order. Content is unchanged from the
-- reconstructed version — only the filename/timestamp changed.
--
-- Two pieces:
--   1. courses.show_classmates — a per-course teacher toggle (default
--      on). When off, students in that course see no classmate list at
--      all, regardless of enrollment.
--   2. get_classmates(p_course_id) — SECURITY DEFINER function. Runs
--      as its owner (bypassing users_select_scoped) specifically to
--      return classmate names, but stays intentionally narrow: only
--      full_name (no email, no role beyond implicit "student", no
--      last_seen_at or anything else on the users row), only for
--      students actually enrolled (status = 'active') alongside the
--      calling student, and only if the course currently has
--      show_classmates = true. Returns an empty set — not an error —
--      if the calling student isn't enrolled themselves, or if
--      classmates are toggled off, matching the defensive empty-array
--      shape getClassmates() (courses.ts) already expects back.

alter table courses
    add column show_classmates boolean not null default true;

create or replace function get_classmates(p_course_id uuid)
returns table (id uuid, full_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Calling student must themselves be actively enrolled in this
    -- course, and the course must currently allow classmates to be
    -- visible. Either failing returns an empty set, not an error —
    -- this matches how get_classmates() is meant to fail closed rather
    -- than leak a signal about why nothing came back.
    if not exists (
        select 1
        from enrollments e
        join courses c on c.id = e.course_id
        where e.course_id = p_course_id
          and e.student_id = auth.uid()
          and e.status = 'active'
          and c.show_classmates = true
    ) then
        return;
    end if;

    return query
        select u.id, u.full_name
        from enrollments e
        join users u on u.id = e.student_id
        where e.course_id = p_course_id
          and e.status = 'active'
          and u.deleted_at is null
          -- Exclude the calling student themselves — this is a
          -- classmates list, not a roster including "you".
          and u.id != auth.uid();
end;
$$;

-- authenticated needs execute on the function itself (it runs as the
-- function owner internally, but the calling role still needs
-- permission to invoke it at all).
revoke all on function get_classmates(uuid) from public;
grant execute on function get_classmates(uuid) to authenticated;
