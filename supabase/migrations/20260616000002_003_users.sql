-- 20260616_003_users.sql
-- Source: DATABASE.md §3.1 users
-- NOTE: numbering starts at 003, not 002 — 002_schools.sql was removed from an
-- earlier draft (no `schools` table exists anywhere in this schema; v2.0 is
-- single-school, NFR-SCALE-01). The gap is left as-is per IMPLEMENTATION_READY.md
-- PART II (C-01), since migrations 018+ are referenced by number elsewhere.

-- Extends Supabase auth.users. Row is created automatically via the
-- handle_new_user() trigger on auth.users (see migration 017_triggers.sql).
create table users (
    id              uuid primary key references auth.users(id) on delete cascade,
    full_name       text not null,
    email           text not null,                 -- denormalized from auth.users for easy querying
    role            text not null check (role in ('admin', 'teacher', 'student')),
    avatar_url      text,
    is_active       boolean not null default true,
    last_seen_at    timestamptz,                   -- updated on each authenticated request
    metadata        jsonb not null default '{}',   -- extensible: section, student_number, etc.
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz,                   -- soft delete (deactivation)
    constraint users_email_unique unique (email)
);
