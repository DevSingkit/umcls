-- 20260616_006_assignments_submissions.sql
-- Source: DATABASE.md §3.7 assignments, §3.8 assignment_submissions
-- NOTE: created here for schema completeness, but VERSION_ROADMAP.md cuts
-- Assignments (file-upload homework, distinct from quizzes) from V1 — no
-- V1 code path writes to these tables yet (PH3-004/PH4-003/PH5-001 are V2).

-- passing_score has no PRD functional requirement at the assignment level —
-- FR-TEACH-17 defines passing_score for quizzes only. No trigger or RLS
-- policy in this schema reads the assignment-level column.
create table assignments (
    id              uuid primary key default gen_random_uuid(),
    course_id       uuid not null references courses(id) on delete cascade,
    lesson_id       uuid references lessons(id) on delete set null,
    created_by      uuid not null references users(id) on delete restrict,
    title           text not null,
    instructions    jsonb,                         -- TipTap JSON rich text
    due_at          timestamptz,
    max_score       numeric(6,2) not null default 100,
    passing_score   numeric(6,2) not null default 60,  -- see note above; unused elsewhere in this schema
    attachment_path text,                          -- optional teacher-provided file
    allow_late      boolean not null default false,
    is_published    boolean not null default false,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz
);

create table assignment_submissions (
    id              uuid primary key default gen_random_uuid(),
    assignment_id   uuid not null references assignments(id) on delete cascade,
    student_id      uuid not null references users(id) on delete cascade,
    response_text   text,                          -- plain text or rich text response
    file_path       text,                          -- Supabase Storage path for uploaded file
    file_name       text,
    submitted_at    timestamptz not null default now(),
    is_late         boolean not null default false,
    status          text not null default 'submitted'
                        check (status in ('submitted', 'graded', 'returned', 'resubmitted')),
    -- Grading fields
    score           numeric(6,2),
    feedback        text,
    graded_by       uuid references users(id),
    graded_at       timestamptz,
    -- One active submission per student per assignment
    constraint submissions_unique unique (assignment_id, student_id)
);
