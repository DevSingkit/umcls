-- 20260705_022_scope_answer_options_for_student.sql
-- Fixes a real IDOR/information-disclosure gap found during the PH8-002
-- manual pentest checklist walkthrough (IDOR section, answer_options
-- review): answer_options_for_student (019_rls_policies.sql) had no
-- enrollment or ownership scoping at all. It stripped is_correct
-- correctly, but returned option_text for every question_id in the
-- entire system to any authenticated student, since it's a bare
-- `select ... from answer_options` view with security_invoker = false
-- and no WHERE clause.
--
-- This was NOT exploitable through the app UI (get-quiz-for-student.ts
-- only ever passes question_ids already filtered by the RLS-scoped
-- `questions` table, which does check is_enrolled()). It WAS exploitable
-- by any authenticated student calling Supabase's REST endpoint directly
-- (e.g. GET /rest/v1/answer_options_for_student?question_id=eq.<any-id>),
-- bypassing the server action and its filtering entirely. This let a
-- student enumerate question/answer-option text for any quiz in the
-- system, including quizzes in courses they are not enrolled in.
--
-- Fix: add enrollment scoping directly to the view definition, so it
-- can't be bypassed by calling the REST API directly, no matter what
-- the calling server action does or doesn't pre-filter.
--
-- Depends on: is_enrolled() (018_rls_helpers.sql), quizzes/questions
-- tables (007_quizzes_questions.sql).

create or replace view answer_options_for_student
with (security_invoker = false) as
    select
        ao.id,
        ao.question_id,
        ao.option_text,
        ao.order_index
    from answer_options ao
    join questions q on q.id = ao.question_id
    join quizzes qz on qz.id = q.quiz_id
    where is_enrolled(qz.course_id);
-- is_correct remains intentionally excluded (unchanged from 019).
-- security_invoker = false is unchanged and still required: `authenticated`
-- has no direct grant on answer_options (revoked in 019), so the view must
-- run as its owner to read the base table. auth.uid() inside is_enrolled()
-- is session-scoped, not affected by view ownership, so this still checks
-- the *calling* student's own enrollment, not the view owner's.

-- No grant changes needed — grant on the view to `authenticated` and the
-- revoke on the base table both already exist from 019_rls_policies.sql.
