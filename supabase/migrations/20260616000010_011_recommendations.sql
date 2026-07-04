-- 20260616_011_recommendations.sql
-- Source: DATABASE.md §3.17 recommendations (ADR-006)

create table recommendations (
    id              uuid primary key default gen_random_uuid(),
    student_id      uuid not null references users(id) on delete cascade,
    course_id       uuid not null references courses(id) on delete cascade,
    lesson_id       uuid references lessons(id) on delete cascade,
    reason          text not null,                 -- human-readable: "Score < 70% on Lesson 3 Quiz"
    trigger_type    text not null check (trigger_type in (
                        'low_quiz_score', 'low_assignment_score', 'missed_submission', 'competency_gap'
                    )),
    is_dismissed    boolean not null default false,
    created_at      timestamptz not null default now(),
    dismissed_at    timestamptz
);
