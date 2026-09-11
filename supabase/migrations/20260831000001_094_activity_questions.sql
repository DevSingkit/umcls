-- Migration 094: activity_questions, activity_question_options,
-- question_mastery, and attempt_events.question_id
--
-- SCOPE CHANGE (2026-08-31): "one activity" is being redefined from a
-- single prompt+options pair into a container that holds MULTIPLE
-- questions, each with its own options — Duolingo/Quizizz-style, so
-- one activity now plays like a mini-quiz-within-a-mission rather than
-- a single question.
--
-- NAMING: the obvious names (`questions`, `answer_options`) are
-- already taken by the LEGACY quizzes module (public.questions
-- references quiz_id; public.answer_options references question_id
-- pointing at that same table). Running a migration with those names
-- again would collide and break the existing quiz feature entirely —
-- caught and flagged before writing this migration, not discovered by
-- a failed run. This migration therefore uses distinct names:
--   - activity_questions          (was going to be "questions")
--   - activity_question_options   (was going to be "question_options")
--   - question_mastery            (no collision — activity_mastery
--                                   already exists under a different
--                                   name, so "question_mastery" is free)
--
-- MASTERY ARCHITECTURE (locked by user this session, mirrors but does
-- NOT replace Phase 0's activity-level rule):
--   - question_mastery is now where the real "3 correct in a row"
--     streak lives, one row per (student, activity_question).
--   - activity_mastery (existing table, UNCHANGED shape) becomes a
--     derived ROLLUP: an activity reaches 'mastered' only once EVERY
--     one of its activity_questions has independently reached
--     'mastered' in question_mastery. This migration does not alter
--     activity_mastery's columns or constraints — only the
--     application code that writes to it changes (see
--     submit-question-attempt.ts, built after this migration).
--   - mission_progress (existing table, UNCHANGED) still tracks at the
--     mission level exactly as before — this migration doesn't touch
--     it. The mission-level "N correct anywhere in the mission" streak
--     and the activity-level "100% of questions mastered" rollup
--     remain two independent concepts, same separation Phase 0 already
--     established between mission_progress and activity_mastery.
--
-- ATTEMPT LOGGING (locked by user this session): every individual
-- question submit is its own immutable attempt_events row — a student
-- requeued through 5 questions across 7 total attempts to finish one
-- activity produces 7 rows, not 1. attempt_events.activity_id stays
-- NOT NULL (unchanged) so activity-level rollup reporting never needs
-- a join through activity_questions; a new nullable question_id column
-- is added and populated on every new row going forward.
-- attempt_number's SCOPE also narrows: it now counts per (student,
-- question) — "attempt #2 on question B" — not per (student, activity)
-- as before. Nullable rather than NOT NULL specifically so this
-- migration cannot fail against existing historical rows (which have
-- no question to point to) and so old activity-level attempts and new
-- question-level attempts can coexist in analytics via
-- COALESCE(question_id, activity_id) — all three reasons confirmed
-- explicitly by the user before writing this, not assumed.
--
-- RLS: mirrors activities/activity_options/activity_mastery's existing
-- policies exactly, per explicit user confirmation this session — same
-- ownership chain (teacher owns via mission -> lesson -> course),
-- same SELECT-revoked-from-authenticated treatment on the options
-- table (migration 019's activity_options precedent), same
-- service-role-only write restriction on the mastery table (migration
-- 082's activity_mastery/mission_progress precedent — a student must
-- never be able to write their own mastery/streak state directly).

-- ─── activity_questions ──────────────────────────────────────────────
-- One row per question inside an activity. Shape mirrors
-- public.activities exactly, one level deeper (activity_id instead of
-- mission_id), including the same self-referencing remediation column
-- and the same activity_type CHECK values (multiple_choice_single /
-- true_false / short_answer — short_answer still permitted at the DB
-- level but not accepted by the application, same restriction
-- create-mission.ts's header already documents for activities.activity_type).
CREATE TABLE public.activity_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL,
  prompt text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice_single'::text
    CHECK (question_type = ANY (ARRAY['multiple_choice_single'::text, 'true_false'::text, 'short_answer'::text])),
  points numeric NOT NULL DEFAULT 1,
  hint_text text,
  order_index integer NOT NULL DEFAULT 0,
  remediates_question_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_questions_pkey PRIMARY KEY (id),
  CONSTRAINT activity_questions_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id),
  CONSTRAINT activity_questions_remediates_fkey FOREIGN KEY (remediates_question_id) REFERENCES public.activity_questions(id)
);

-- ─── activity_question_options ───────────────────────────────────────
-- Mirrors public.activity_options exactly, pointing at
-- activity_questions instead of activities.
CREATE TABLE public.activity_question_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  CONSTRAINT activity_question_options_pkey PRIMARY KEY (id),
  CONSTRAINT activity_question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.activity_questions(id)
);

-- ─── question_mastery ─────────────────────────────────────────────────
-- Mirrors public.activity_mastery's exact shape (same column names,
-- types, defaults, and CHECK values for `state`) — the only change is
-- the foreign key target: question_id -> activity_questions instead of
-- activity_id -> activities. This is deliberately a copy of that
-- table's structure, not a redesign, so the rollup logic that reads
-- from it can use the exact same 3-in-a-row / state-transition
-- reasoning Phase 0 already locked for activity_mastery.
CREATE TABLE public.question_mastery (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  question_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'new'::text CHECK (state = ANY (ARRAY['new'::text, 'learning'::text, 'mastered'::text])),
  correct_streak integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  hint_uses integer NOT NULL DEFAULT 0,
  last_seen_at timestamp with time zone,
  mastered_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT question_mastery_pkey PRIMARY KEY (id),
  CONSTRAINT question_mastery_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT question_mastery_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.activity_questions(id),
  -- One mastery row per (student, question) — same implicit
  -- uniqueness activity_mastery relies on (its own schema dump doesn't
  -- show an explicit UNIQUE constraint either, but every read/write
  -- path in this codebase treats it as one row per student+activity;
  -- made EXPLICIT here rather than assumed, since the new rollup logic
  -- depends on being able to upsert on this pair safely).
  CONSTRAINT question_mastery_student_question_unique UNIQUE (student_id, question_id)
);

-- Indexes for the lookup patterns the rollup logic and gameplay queue
-- will actually run: "all questions for this activity" and "this
-- student's mastery across a set of question ids."
CREATE INDEX idx_activity_questions_activity_id ON public.activity_questions (activity_id);
CREATE INDEX idx_activity_question_options_question_id ON public.activity_question_options (question_id);
CREATE INDEX idx_question_mastery_student_id ON public.question_mastery (student_id);
CREATE INDEX idx_question_mastery_question_id ON public.question_mastery (question_id);

-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.activity_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_mastery ENABLE ROW LEVEL SECURITY;

-- activity_questions: same read/write ownership chain as
-- public.activities — teacher owns via activity -> mission -> lesson
-- -> course; enrolled students can read questions belonging to
-- missions in courses they're enrolled in (needed for gameplay);
-- writes are teacher-only, scoped by the same ownership chain.

CREATE POLICY activity_questions_teacher_all ON public.activity_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.activities a
      JOIN public.missions m ON m.id = a.mission_id
      JOIN public.lessons l ON l.id = m.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE a.id = activity_questions.activity_id
        AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.activities a
      JOIN public.missions m ON m.id = a.mission_id
      JOIN public.lessons l ON l.id = m.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE a.id = activity_questions.activity_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY activity_questions_student_select ON public.activity_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.activities a
      JOIN public.missions m ON m.id = a.mission_id
      JOIN public.lessons l ON l.id = m.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      JOIN public.enrollments e ON e.course_id = c.id
      WHERE a.id = activity_questions.activity_id
        AND m.is_published = true
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- activity_question_options: SELECT fully revoked from `authenticated`,
-- same as public.activity_options per migration 019's precedent
-- (documented in create-mission.ts's own header). A student answering
-- a question must never be able to directly query which option is
-- correct — the client only ever learns correctness back through
-- submit-question-attempt.ts's graded response, never via a direct
-- table read. Only the owning teacher can SELECT (to build/edit), and
-- only the service role can write (matching how activity_options'
-- inserts already go through create-mission.ts's normal client, which
-- is fine since that flow authenticates as the teacher performing the
-- insert — this mirrors that, teacher inserts, no student read policy
-- exists at all here on purpose).

CREATE POLICY activity_question_options_teacher_all ON public.activity_question_options
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.activity_questions q
      JOIN public.activities a ON a.id = q.activity_id
      JOIN public.missions m ON m.id = a.mission_id
      JOIN public.lessons l ON l.id = m.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE q.id = activity_question_options.question_id
        AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.activity_questions q
      JOIN public.activities a ON a.id = q.activity_id
      JOIN public.missions m ON m.id = a.mission_id
      JOIN public.lessons l ON l.id = m.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE q.id = activity_question_options.question_id
        AND c.teacher_id = auth.uid()
    )
  );

-- No student SELECT policy on activity_question_options at all,
-- matching activity_options' existing revoked-from-authenticated
-- treatment exactly. Reads for gameplay (option text students choose
-- between) go through the admin/service-role client server-side, same
-- as getMissionForTeacher/getMissionForStudent already do for
-- activity_options.
REVOKE SELECT ON public.activity_question_options FROM authenticated;

-- question_mastery: NO direct write policy for `authenticated` at
-- all — mirrors mission_progress/activity_mastery's existing rule
-- exactly (migration 082's precedent, referenced directly in
-- create-mission.ts's own comments: "a student can never write their
-- own mastery"). Writes MUST go through the admin/service-role client
-- in submit-question-attempt.ts, same as submit-activity-attempt.ts
-- already does for activity_mastery. Reads are scoped to the owning
-- student (their own mastery) and the teacher who owns the course
-- (for the same kind of progress-override view
-- getMissionProgressForTeacher already provides at the mission level).

CREATE POLICY question_mastery_student_select ON public.question_mastery
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY question_mastery_teacher_select ON public.question_mastery
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.activity_questions q
      JOIN public.activities a ON a.id = q.activity_id
      JOIN public.missions m ON m.id = a.mission_id
      JOIN public.lessons l ON l.id = m.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE q.id = question_mastery.question_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Deliberately no INSERT/UPDATE/DELETE policy for `authenticated` on
-- question_mastery — same as activity_mastery, all writes go through
-- the service-role client only.

-- ─── attempt_events.question_id ────────────────────────────────────
-- Nullable per explicit user confirmation this session (three reasons
-- given: won't fail against existing historical rows that predate
-- this feature, standard "never corrupt legacy data" migration
-- practice, and lets old activity-level rows and new question-level
-- rows coexist in analytics via COALESCE(question_id, activity_id)).
-- activity_id itself is UNCHANGED — still NOT NULL, still populated on
-- every row, so activity-level rollup reporting ("how many total
-- attempts inside Activity X") never needs a join through
-- activity_questions. This column is populated by
-- submit-question-attempt.ts (the renamed/reworked
-- submit-activity-attempt.ts) on every new insert going forward — this
-- migration only adds the column, it does not backfill historical rows.
ALTER TABLE public.attempt_events
  ADD COLUMN question_id uuid,
  ADD CONSTRAINT attempt_events_question_id_fkey
    FOREIGN KEY (question_id) REFERENCES public.activity_questions(id);

CREATE INDEX idx_attempt_events_question_id ON public.attempt_events (question_id);
