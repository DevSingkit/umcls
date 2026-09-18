-- 20260916000001_108_fix_activity_question_options_select_recursion.sql
--
-- Migration 096's activity_question_options_select_teacher_admin
-- self-joined activity_question_options back onto itself inside its
-- own USING clause, causing "infinite recursion detected in policy
-- for relation activity_question_options" (42P17) on any operation
-- touching this table. Confirmed live via updateActivity's
-- delete-then-reinsert failing with this exact error.
--
-- Fix: start the ownership chain from activity_questions instead,
-- same pattern the correct, non-recursive
-- activity_question_options_insert policy (same migration 096)
-- already uses.

DROP POLICY IF EXISTS "activity_question_options_select_teacher_admin" ON public.activity_question_options;

CREATE POLICY "activity_question_options_select_teacher_admin"
ON public.activity_question_options FOR SELECT TO authenticated
USING (
    is_course_teacher((
        SELECT l.course_id FROM public.activity_questions q
        JOIN public.activities a ON a.id = q.activity_id
        JOIN public.missions m ON m.id = a.mission_id
        JOIN public.lessons l ON l.id = m.lesson_id
        WHERE q.id = activity_question_options.question_id
    ))
    OR auth_role() = 'admin'
);