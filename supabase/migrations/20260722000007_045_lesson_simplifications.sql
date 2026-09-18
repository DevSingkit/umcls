-- 045_lesson_simplifications.sql

create table lesson_simplifications (
    id uuid primary key default gen_random_uuid(),
    lesson_id uuid not null unique references lessons(id) on delete cascade,
    content text not null,
    is_published boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

alter table lesson_simplifications enable row level security;

create policy simplifications_teacher_all
on lesson_simplifications
for all
to authenticated
using (
    is_course_teacher((select l.course_id from lessons l where l.id = lesson_simplifications.lesson_id))
)
with check (
    is_course_teacher((select l.course_id from lessons l where l.id = lesson_simplifications.lesson_id))
);

create policy simplifications_select_student
on lesson_simplifications
for select
to authenticated
using (
    auth_role() = 'student'
    and is_published = true
    and deleted_at is null
    and exists (
        select 1 from lessons l
        join enrollments e on e.course_id = l.course_id
        where l.id = lesson_simplifications.lesson_id
          and e.student_id = auth.uid()
          and e.status = 'active'
    )
);