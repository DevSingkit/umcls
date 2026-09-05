-- 20260905000002_100_missions_shuffle_options.sql
-- Adaptive-engine Phase E follow-up (2026-09-05 session, continued):
-- teacher-controlled toggle for whether a question's answer options
-- are shown in a shuffled order or the fixed order_index order used
-- today. No shuffling exists anywhere in the app currently — options
-- are always read ordered by order_index (see
-- get-mission-for-student.ts's getMissionPreviewForStudent) — so this
-- is a new feature, not a fix.
--
-- Defaults to false (no shuffle), NOT true like reveal_correct_answer
-- (migration 099) did — that one restored an already-intended-but-
-- never-built default from the original DESIGN-LMS 2.1 mockup.
-- Shuffling has no such prior intent to restore: it's a brand new
-- capability, and every existing mission's current fixed-order
-- behavior must not change unless a teacher explicitly opts in.
--
-- No RLS changes needed, same reasoning as migration 099 — a new
-- column under an existing SELECT policy needs no new policy, only
-- explicit column-list additions at each call site that wants it.

alter table public.missions
  add column shuffle_options boolean not null default false;
