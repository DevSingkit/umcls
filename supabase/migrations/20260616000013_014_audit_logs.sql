-- 20260616_014_audit_logs.sql
-- Source: DATABASE.md §3.20 audit_logs
-- Immutable event log. Append-only enforced by log_audit_event() (019_rls_policies.sql)
-- and the immutability trigger (017_triggers.sql) — no direct insert/update/delete
-- policy is ever granted on this table.

create table audit_logs (
    id              bigint generated always as identity primary key,
    actor_id        uuid references users(id) on delete set null,
    actor_role      text,
    action          text not null,                 -- e.g. USER_CREATED, GRADE_UPDATED
    target_table    text,
    target_id       text,
    old_values      jsonb,                         -- before state (for updates)
    new_values      jsonb,                         -- after state
    ip_address      inet,
    user_agent      text,
    metadata        jsonb not null default '{}',
    created_at      timestamptz not null default now()
);
