-- 20260714000003_041_ai_generation_logs_provider_mode.sql
-- Adds provider/generation_mode to ai_generation_logs and makes model
-- nullable. Confirmed missing from the live DB via schema dump 2026-07-14
-- (model was NOT NULL DEFAULT 'gemini-1.5-flash', no provider or
-- generation_mode columns at all).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS handles the columns; the
-- constraint is guarded with a DO block checking pg_constraint first,
-- since ALTER TABLE ADD CONSTRAINT has no IF NOT EXISTS clause in plain
-- PostgreSQL. Safe to rerun this whole file if a previous attempt
-- partially applied.

alter table ai_generation_logs
    add column if not exists provider text not null default 'gemini'
        check (provider in ('gemini')),
    add column if not exists generation_mode text not null default 'ai'
        check (generation_mode in ('ai', 'manual'));

-- model was NOT NULL with a default — manual-mode rows should record no
-- model at all (no AI call was made), so it must become nullable.
alter table ai_generation_logs
    alter column model drop not null,
    alter column model drop default;

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'ai_logs_manual_or_ai'
    ) then
        alter table ai_generation_logs
            add constraint ai_logs_manual_or_ai check (
                (generation_mode = 'manual' and model is null and input_tokens is null and output_tokens is null)
                or (generation_mode = 'ai' and model is not null)
            );
    end if;
end $$;
