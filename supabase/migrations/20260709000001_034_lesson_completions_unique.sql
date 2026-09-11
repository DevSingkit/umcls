-- 20260709000001_034_lesson_completions_unique.sql
-- Fixes the gap flagged in PH4-002's 2026-07-06 status note: the
-- acceptance criteria ("Lesson completion inserted once; second view
-- does not error") assumed a unique constraint on
-- (lesson_id, student_id) already existed on lesson_completions, but it
-- never did. completions.ts worked around this with a check-then-insert,
-- which leaves a small race window if a student's scroll-depth trigger
-- and a second tab/request land at nearly the same time.
--
-- This adds the real constraint, which lets markLessonComplete switch
-- to a true upsert (ON CONFLICT DO NOTHING) instead of check-then-insert,
-- closing the race entirely rather than just narrowing it.
--
-- Before adding the constraint, de-duplicate any rows that may already
-- exist from the check-then-insert window (keeps the earliest
-- completed_at per lesson/student pair, drops any later duplicates).
delete from lesson_completions a
using lesson_completions b
where a.lesson_id = b.lesson_id
  and a.student_id = b.student_id
  and a.completed_at > b.completed_at;

alter table lesson_completions
    add constraint lesson_completions_unique unique (lesson_id, student_id);
