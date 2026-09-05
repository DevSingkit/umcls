-- 20260905000001_099_missions_reveal_correct_answer.sql
-- Adaptive-engine Phase E follow-up (2026-09-05 session): missions had
-- no way for a teacher to control whether the correct answer is
-- revealed to a student after a wrong attempt. submit-question-
-- attempt.ts never returned the correct option at all — this is the
-- first half of adding that as a real per-mission teacher setting; it
-- is a new feature, not a fix to something that regressed.
--
-- Defaults to true (reveal) rather than false, since that's what the
-- ORIGINAL DESIGN-LMS 2.1 mockup for the "Incorrect Answer Sheet"
-- always assumed ("Text: Displays the correct answer option clearly")
-- — this restores that intended default rather than silently
-- introducing a stricter one existing missions never opted into.
--
-- No RLS changes needed: missions' existing SELECT policies already
-- govern this column the same as every other column on the table —
-- adding a column doesn't require a new policy, only call sites that
-- want to read it need to add it to their own explicit column list
-- (get-mission-for-student.ts's getMissionPreviewForStudent does NOT
-- need it — the reveal decision is resolved server-side inside
-- submit-question-attempt.ts, the student client never needs to know
-- the setting itself, only the resulting correct-answer field or lack
-- of one).

alter table public.missions
  add column reveal_correct_answer boolean not null default true;
