-- 20260616_007_quizzes_questions.sql
-- Source: DATABASE.md §3.9 quizzes
--
-- DEVIATION FROM DATABASE.md, NOTED FOR THE RECORD:
-- This file's name implies it should also create `questions`, but `questions`
-- has an FK to `question_bank(id)` (§3.11), and question_bank is created in
-- the NEXT migration (008_question_bank.sql) per IMPLEMENTATION_READY.md's
-- migration order. Creating `questions` here would fail against a
-- not-yet-existing `question_bank` table. `questions` and `answer_options`
-- are therefore created in 008_question_bank.sql instead, immediately after
-- question_bank, which is both dependency-safe and still a reasonable
-- grouping (bank + the per-quiz questions that reference it).

-- Note (superseded 2026-07-02): quizzes previously had an allow_reteach_retry
-- boolean; it was never implemented by any trigger/RLS policy and is not
-- included below. Retry-granting is a V2/V3 concern (reteach_retake_requests,
-- §11.8, migration 028) — not part of this V1 base table.
create table quizzes (
    id              uuid primary key default gen_random_uuid(),
    course_id       uuid not null references courses(id) on delete cascade,
    lesson_id       uuid references lessons(id) on delete set null,
    created_by      uuid not null references users(id) on delete restrict,
    title           text not null,
    description     text,
    time_limit_minutes integer,                    -- null = no time limit
    max_attempts    integer not null default 1,
    passing_score   numeric(5,2) not null default 60,  -- teacher-editable; also drives re-teach threshold in V2/V3
    shuffle_questions boolean not null default false,
    shuffle_options   boolean not null default false,
    show_results_after text not null default 'submission'
                        check (show_results_after in ('submission', 'grading', 'never')),
    is_published    boolean not null default false,
    available_from  timestamptz,
    available_until timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz
);
