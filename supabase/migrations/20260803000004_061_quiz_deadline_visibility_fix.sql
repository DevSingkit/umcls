-- 20260803_061_quiz_deadline_visibility_fix.sql
--
-- Real bug found 2026-08-03, same day migration 060 activated
-- quizzes.available_until: quizzes_select_student (migration 019,
-- unchanged since) has always included
--
--   (available_until is null or available_until >= now())
--
-- in its USING clause. This was harmless before today because nothing
-- ever set available_until, so it was always null and always true.
-- The moment QuizDeadlineSetting.tsx (migration 060's own UI) started
-- setting a real value, any quiz past its deadline became completely
-- invisible to the student SELECT policy — not just locked from
-- submission. A student hitting the quiz page got a clean zero-row
-- result, which the page's own error handling turns into a 404,
-- indistinguishable from the quiz never having existed.
--
-- This contradicts migration 060's own stated design: that comment
-- explicitly says deadline enforcement lives in
-- prevent_response_after_expiry (blocks further responses on an
-- in-progress attempt) and in startQuizAttempt/gradeQuizSubmission
-- (block starting/finalizing past the deadline) — not in read
-- visibility. A quiz past its deadline should still be fully viewable
-- (including any already-submitted/graded attempt's results), it
-- should just refuse new attempts.
--
-- Fix: drop the available_until upper-bound check from
-- quizzes_select_student. available_from is left untouched — "not
-- released yet" is a genuinely different concept (a quiz that
-- shouldn't be visible before a start time, same idea as
-- is_published), not the deadline this migration is about.

drop policy if exists "quizzes_select_student" on quizzes;

create policy "quizzes_select_student"
on quizzes for select to authenticated
using (
    auth_role() = 'student'
    and is_published = true
    and is_enrolled(course_id)
    and deleted_at is null
    and (available_from is null or available_from <= now())
);
