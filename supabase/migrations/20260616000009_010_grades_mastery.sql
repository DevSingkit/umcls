-- 20260616_010_grades_mastery.sql
-- Source: DATABASE.md §3.15 grades, §3.16 mastery_records

-- Consolidated grade record per student per course. Recomputed on each graded event.
-- M-02 (revised 2026-07-02): written exclusively by the gradeSubmission Server
-- Action using the user-scoped client — see 019_rls_policies.sql grades block,
-- which is the real enforcement mechanism, not a service-role backstop.
create table grades (
    id                  uuid primary key default gen_random_uuid(),
    course_id           uuid not null references courses(id) on delete cascade,
    student_id          uuid not null references users(id) on delete cascade,
    assignment_average  numeric(5,2),
    quiz_average        numeric(5,2),
    overall_grade       numeric(5,2),
    letter_grade        text,
    computed_at         timestamptz not null default now(),
    constraint grades_unique unique (course_id, student_id)
);

-- Per-student mastery level per competency tag. Used for future adaptive learning.
create table mastery_records (
    id              uuid primary key default gen_random_uuid(),
    student_id      uuid not null references users(id) on delete cascade,
    course_id       uuid not null references courses(id) on delete cascade,
    competency_tag  text not null,
    mastery_level   numeric(4,2) not null default 0  -- 0.0 to 1.0
                        check (mastery_level >= 0 and mastery_level <= 1),
    attempts_count  integer not null default 0,
    last_assessed_at timestamptz,
    updated_at      timestamptz not null default now(),
    constraint mastery_unique unique (student_id, course_id, competency_tag)
);
