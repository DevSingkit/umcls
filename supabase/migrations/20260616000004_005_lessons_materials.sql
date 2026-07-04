-- 20260616_005_lessons_materials.sql
-- Source: DATABASE.md §3.5 lessons, §3.6 materials
-- NOTE: materials is created here for schema completeness/traceability with
-- DATABASE.md, but VERSION_ROADMAP.md cuts file attachments (PH3-003) from
-- V1 — no V1 code path writes to this table yet. Harmless empty table.

create table lessons (
    id              uuid primary key default gen_random_uuid(),
    course_id       uuid not null references courses(id) on delete cascade,
    title           text not null,
    content         jsonb,                         -- TipTap JSON document
    youtube_url     text,                          -- optional embedded video
    order_index     integer not null default 0,
    is_published    boolean not null default false,
    estimated_minutes integer,                     -- reading/study time hint
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz
);

-- Files attached to lessons or courses. Stored in Supabase Storage.
-- H-01: standardized on deleted_at (the redundant is_deleted boolean was removed).
create table materials (
    id              uuid primary key default gen_random_uuid(),
    course_id       uuid not null references courses(id) on delete cascade,
    lesson_id       uuid references lessons(id) on delete set null,  -- null = course-wide
    uploaded_by     uuid not null references users(id) on delete restrict,
    file_name       text not null,
    file_type       text not null,                 -- MIME type: application/pdf, etc.
    file_size_bytes bigint not null,
    storage_path    text not null,                 -- Supabase Storage object path
    created_at      timestamptz not null default now(),
    deleted_at      timestamptz
);
