-- Migration 096: fix RLS on activity_questions / activity_question_options /
-- question_mastery to match the real house pattern from migration 082.
--
-- Corrects migration 094's RLS, which was already pushed live with two real
-- gaps: (1) raw inlined EXISTS subqueries instead of the established
-- is_course_teacher()/is_enrolled()/auth_role() helper functions, and
-- (2) missing the auth_role() = 'admin' bypass that every one of 082's
-- teacher-facing SELECT policies has. This migration only replaces policies —
-- no table structure, data, or grants beyond what 094 already set are touched.

-- ─── activity_questions ─────────────────────────────────────────────
DROP POLICY IF EXISTS "activity_questions_teacher_all" ON public.activity_questions;
DROP POLICY IF EXISTS "activity_questions_student_select" ON public.activity_questions;

CREATE POLICY "activity_questions_select_student"
ON public.activity_questions FOR SELECT TO authenticated
USING (
    auth_role() = 'student'
    AND is_enrolled((
        SELECT l.course_id FROM public.activities a
        JOIN public.missions m ON m.id = a.mission_id
        JOIN public.lessons l ON l.id = m.lesson_id
        WHERE a.id = activity_questions.activity_id
    ))
);

CREATE POLICY "activity_questions_select_teacher"
ON public.activity_questions FOR SELECT TO authenticated
USING (
    is_course_teacher((
        SELECT l.course_id FROM public.activities a
        JOIN public.missions m ON m.id = a.mission_id
        JOIN public.lessons l ON l.id = m.lesson_id
        WHERE a.id = activity_questions.activity_id
    ))
    OR auth_role() = 'admin'
);

CREATE POLICY "activity_questions_insert"
ON public.activity_questions FOR INSERT TO authenticated
WITH CHECK (
    auth_role() = 'teacher'
    AND is_course_teacher((
        SELECT l.course_id FROM public.activities a
        JOIN public.missions m ON m.id = a.mission_id
        JOIN public.lessons l ON l.id = m.lesson_id
        WHERE a.id = activity_questions.activity_id
    ))
);

CREATE POLICY "activity_questions_update"
ON public.activity_questions FOR UPDATE TO authenticated
USING (
    auth_role() = 'teacher'
    AND is_course_teacher((
        SELECT l.course_id FROM public.activities a
        JOIN public.missions m ON m.id = a.mission_id
        JOIN public.lessons l ON l.id = m.lesson_id
        WHERE a.id = activity_questions.activity_id
    ))
);

-- ─── activity_question_options ──────────────────────────────────────
DROP POLICY IF EXISTS "activity_question_options_teacher_all" ON public.activity_question_options;

CREATE POLICY "activity_question_options_select_teacher_admin"
ON public.activity_question_options FOR SELECT TO authenticated
USING (
    is_course_teacher((
        SELECT l.course_id FROM public.activity_question_options aqo
        JOIN public.activity_questions q ON q.id = aqo.question_id
        JOIN public.activities a ON a.id = q.activity_id
        JOIN public.missions m ON m.id = a.mission_id
        JOIN public.lessons l ON l.id = m.lesson_id
        WHERE aqo.id = activity_question_options.id
    ))
    OR auth_role() = 'admin'
);

CREATE POLICY "activity_question_options_insert"
ON public.activity_question_options FOR INSERT TO authenticated
WITH CHECK (
    auth_role() = 'teacher'
    AND is_course_teacher((
        SELECT l.course_id FROM public.activity_questions q
        JOIN public.activities a ON a.id = q.activity_id
        JOIN public.missions m ON m.id = a.mission_id
        JOIN public.lessons l ON l.id = m.lesson_id
        WHERE q.id = question_id
    ))
);

-- REVOKE SELECT / GRANT service_role already correctly set by 094 — untouched.

-- ─── question_mastery ────────────────────────────────────────────────
DROP POLICY IF EXISTS "question_mastery_student_select" ON public.question_mastery;
DROP POLICY IF EXISTS "question_mastery_teacher_select" ON public.question_mastery;

CREATE POLICY "question_mastery_select"
ON public.question_mastery FOR SELECT TO authenticated
USING (
    student_id = auth.uid()
    OR is_course_teacher((
        SELECT l.course_id FROM public.activity_questions q
        JOIN public.activities a ON a.id = q.activity_id
        JOIN public.missions m ON m.id = a.mission_id
        JOIN public.lessons l ON l.id = m.lesson_id
        WHERE q.id = question_mastery.question_id
    ))
    OR auth_role() = 'admin'
);