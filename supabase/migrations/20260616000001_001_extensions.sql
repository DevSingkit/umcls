-- 20260616_001_extensions.sql
-- Source: DATABASE.md §2 Schema Setup

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";     -- fast ILIKE search on names/emails
create extension if not exists "btree_gin";   -- composite GIN indexes

-- All custom tables go into public schema (Supabase default)
-- Supabase Auth tables live in the auth schema (managed)
