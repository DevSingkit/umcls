-- 20260616_008_question_bank.sql
-- Source: DATABASE.md §3.10 question_bank, §3.11 questions, §3.12 answer_options
-- See the note in 007_quizzes_questions.sql for why `questions` and
-- `answer_options` were moved here instead of the previous file.
--
-- v2.0 note [C-01]: 'checklist' is included directly in the CHECK constraints
-- below (not added later via migration 021's ALTER), so a fresh V1 deploy
-- from this file alone already matches the v2.0 base schema.

-- Central repository; questions can be reused across quizzes.
create table question_bank (
    id              uuid primary key default gen_random_uuid(),
    created_by      uuid not null references users(id) on delete restrict,
    question_text   text not null,
    question_type   text not null check (question_type in (
                        'multiple_choice_single',    -- Single correct answer
                        'multiple_choice_multiple',  -- Multiple correct answers
                        'true_false',                -- Binary True/False
                        'short_answer',               -- Text response, manually graded (V2)
                        'checklist'                  -- Multi-item checklist, auto-gradable like multiple_choice_multiple
                        -- 'essay' intentionally not included — out of PRD v1.0 scope (MAJ-01).
                    )),
    difficulty      text not null default 'medium'
                        check (difficulty in ('easy', 'medium', 'hard')),
    subject         text,
    competency_tags text[] not null default '{}',  -- Bloom's Taxonomy / topic tags
    explanation     text,                          -- shown after answer revealed
    is_ai_generated boolean not null default false,
    source_lesson_id uuid references lessons(id) on delete set null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz
);

-- Questions assigned to a specific quiz (references question_bank).
create table questions (
    id              uuid primary key default gen_random_uuid(),
    quiz_id         uuid not null references quizzes(id) on delete cascade,
    question_bank_id uuid references question_bank(id) on delete set null,
    question_text   text not null,                 -- copied at assignment time (snapshot)
    question_type   text not null check (question_type in (
                        'multiple_choice_single',
                        'multiple_choice_multiple',
                        'true_false',
                        'short_answer',
                        'checklist'
                    )),
    points          numeric(5,2) not null default 1,
    difficulty      text not null default 'medium',
    explanation     text,
    order_index     integer not null default 0,
    created_at      timestamptz not null default now()
);

-- Options for multiple_choice and true_false questions.
-- Security note (FIND-001 / RC-03): the raw table (with is_correct) is NOT
-- granted to `authenticated` — see 019_rls_policies.sql, which revokes
-- direct SELECT and exposes answer_options_for_student instead.
create table answer_options (
    id              uuid primary key default gen_random_uuid(),
    question_id     uuid not null references questions(id) on delete cascade,
    option_text     text not null,
    is_correct      boolean not null default false,
    order_index     integer not null default 0
);
