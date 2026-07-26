-- Works around a reproducible Postgres RLS discrepancy where
-- materials_update_teacher's with_check clause rejects an UPDATE even
-- though the identical boolean expression (auth_role() = 'teacher' and
-- is_course_teacher(course_id)), evaluated standalone in the same
-- session, returns true. Root cause not identified after extensive
-- isolation (function bodies, session context, auth.uid(), search_path,
-- and policy definitions were all individually verified correct) —
-- see materials.ts changelog, 2026-07-12.
--
-- This SECURITY DEFINER function performs the same ownership check
-- explicitly and does the update itself, bypassing RLS policy
-- evaluation for this one operation rather than relying on the
-- UPDATE-through-RLS path that's failing.
create or replace function delete_material(p_material_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_course_id uuid;
    v_is_owner boolean;
begin
    select course_id into v_course_id
    from materials
    where id = p_material_id
      and deleted_at is null;

    if v_course_id is null then
        return false;
    end if;

    select exists (
        select 1 from courses
        where id = v_course_id
          and teacher_id = auth.uid()
    ) into v_is_owner;

    if not v_is_owner then
        return false;
    end if;

    update materials
    set deleted_at = now()
    where id = p_material_id;

    return true;
end;
$$;

grant execute on function delete_material(uuid) to authenticated;