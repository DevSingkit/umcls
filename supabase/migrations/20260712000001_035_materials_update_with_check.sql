-- Fixes materials_update_teacher: had `using` but no `with check`,
-- discovered because deleteMaterial()'s soft-delete UPDATE was being
-- rejected by RLS with no diagnostic info until the error message was
-- surfaced (see materials.ts changelog, 2026-07-12). Same class of gap
-- SECURITY.md §4.6 already found and fixed on reteach_lessons — an
-- UPDATE policy with `using` only is incomplete, not just stylistically
-- inconsistent, and should be treated as a latent bug wherever it
-- appears in this schema.

drop policy if exists "materials_update_teacher" on materials;

create policy "materials_update_teacher"
on materials for update to authenticated
using (
    auth_role() = 'teacher' and is_course_teacher(course_id)
)
with check (
    auth_role() = 'teacher' and is_course_teacher(course_id)
);