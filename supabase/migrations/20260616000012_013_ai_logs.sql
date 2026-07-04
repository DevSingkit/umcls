-- 20260616_013_ai_logs.sql
-- Source: DATABASE.md §3.19 ai_generation_logs
-- NOTE: created for schema completeness; no V1 code path writes here yet
-- (AI features are V3, tasks.md PH9-001/PH9-004). FIND-020: no prompt text
-- is ever stored, to avoid inadvertently logging student PII.

create table ai_generation_logs (
    id                  uuid primary key default gen_random_uuid(),
    requested_by        uuid not null references users(id),
    lesson_id           uuid references lessons(id) on delete set null,
    model               text not null default 'gemini-1.5-flash',
    questions_requested integer not null,  -- vestigial (AI Question Generator removed, PIVOT-01)
    questions_generated integer,           -- vestigial (AI Question Generator removed, PIVOT-01)
    input_tokens        integer,
    output_tokens       integer,
    status              text not null check (status in ('success', 'failed', 'partial')),
    error_message       text,
    created_at          timestamptz not null default now()
);
