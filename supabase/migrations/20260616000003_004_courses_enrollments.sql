-- 20260616_004_courses_enrollments.sql
-- Source: DATABASE.md §3.3 courses, §3.4 enrollments

create table courses (
    id              uuid primary key default gen_random_uuid(),
    teacher_id      uuid not null references users(id) on delete restrict,
    title           text not null,
    description     text,
    subject         text,                          -- e.g. "Mathematics", "Computer Science"
    cover_image_url text,
    is_published    boolean not null default false,
    settings        jsonb not null default '{}',   -- max_quiz_attempts, late_submission_policy, etc.
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz
);

-- Many-to-many join between students and courses.
create table enrollments (
    id              uuid primary key default gen_random_uuid(),
    course_id       uuid not null references courses(id) on delete cascade,
    student_id      uuid not null references users(id) on delete cascade,
    enrolled_by     uuid references users(id),     -- admin who enrolled the student
    status          text not null default 'active' check (status in ('active', 'dropped', 'completed')),
    enrolled_at     timestamptz not null default now(),
    dropped_at      timestamptz,
    completed_at    timestamptz,
    constraint enrollments_unique unique (course_id, student_id)
);
