-- 20260616_009_attempts_responses.sql
-- Source: DATABASE.md §3.13 quiz_attempts, §3.14 quiz_responses

-- One row per student attempt. Created at start, updated at submission.
create table quiz_attempts (
    id                      uuid primary key default gen_random_uuid(),
    quiz_id                 uuid not null references quizzes(id) on delete cascade,
    student_id              uuid not null references users(id) on delete cascade,
    attempt_number          integer not null default 1,
    started_at              timestamptz not null default now(),
    submitted_at            timestamptz,
    time_remaining_seconds  integer,               -- persisted for crash recovery
    status                  text not null default 'in_progress'
                                check (status in ('in_progress', 'submitted', 'graded', 'abandoned')),
    score                   numeric(5,2),          -- calculated at submission
    is_passing              boolean,
    graded_at               timestamptz,
    constraint quiz_attempts_unique unique (quiz_id, student_id, attempt_number)
);

-- One row per question per attempt.
create table quiz_responses (
    id                   uuid primary key default gen_random_uuid(),
    attempt_id           uuid not null references quiz_attempts(id) on delete cascade,
    question_id          uuid not null references questions(id) on delete cascade,

    -- Single-answer MCQ and True/False: exactly one option ID
    selected_option_id   uuid references answer_options(id) on delete set null,

    -- Multiple-answer MCQ (question_type = 'multiple_choice_multiple'):
    -- Stores the UUIDs of every option the student selected.
    -- NULL for non-multiple-answer question types.
    selected_option_ids  uuid[],

    -- Short answer text (question_type = 'short_answer'). 'essay' is out of v1.0 scope (MAJ-01).
    text_response        text,

    is_correct           boolean,        -- null until graded; null for short_answer
    points_awarded       numeric(5,2),
    answered_at          timestamptz not null default now(),

    constraint quiz_responses_unique unique (attempt_id, question_id),

    -- Exactly one answer modality must be used per response (M-10: an empty
    -- array is rejected so deselecting every option cannot pass as "answered").
    constraint responses_has_answer check (
        (selected_option_id  is not null and selected_option_ids is null     and text_response is null)
        or (selected_option_ids is not null and array_length(selected_option_ids, 1) > 0
            and selected_option_id  is null  and text_response is null)
        or (text_response     is not null   and selected_option_id  is null  and selected_option_ids is null)
    )
);

-- Index for fast lookup of all responses for an attempt
create index idx_quiz_responses_attempt on quiz_responses(attempt_id);
-- Index for auto-grading queries that join on question_id
create index idx_quiz_responses_question on quiz_responses(question_id);
