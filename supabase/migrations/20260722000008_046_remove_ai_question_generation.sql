-- ai_generation_logs: drop the two columns that were specific to AI
-- question generation (a dead, never-used feature — question_bank has
-- zero rows). Table itself stays; it's reused for simplify logging
-- via the existing provider/generation_mode/model/tokens/status columns.
alter table ai_generation_logs drop column questions_requested;
alter table ai_generation_logs drop column questions_generated;

-- question_bank: drop only the AI-tracking flag. source_lesson_id stays
-- — it's still meaningful for manually-authored questions tied to a
-- lesson, which is a separate, still-active feature.
alter table question_bank drop column is_ai_generated;
