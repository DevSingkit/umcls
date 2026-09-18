-- Adds an optional per-response feedback field for manually-graded
-- (short_answer) quiz_responses. TASKS.md PH4-006 calls for this field;
-- it did not exist in the original schema.
alter table quiz_responses add column feedback text;