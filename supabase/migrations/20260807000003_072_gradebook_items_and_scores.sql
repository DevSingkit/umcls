-- Manual gradebook, separate from assignments/quizzes. A teacher
-- builds their own columns ("gradebook items") — free-text label
-- ("A1", "Q1", "R"), which DepEd component it counts toward, and a max
-- score. A column can optionally link to a real assignment or quiz for
-- a one-time score pull (see get-gradebook.ts's pullLinkedScores) —
-- after that pull, scores are just regular editable cells, no ongoing
-- sync. This is why gradebook_scores is its own table rather than
-- reading assignment_submissions/quiz_attempts directly: it needs to
-- hold manually typed scores that never came from a real submission at
-- all (e.g. recitation, "R").
--
-- Every enrolled student is always a row in the gradebook grid — that
-- comes from enrollments, not from this table. gradebook_scores simply
-- has no row for a student until someone grades that cell.

CREATE TABLE public.gradebook_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  component grading_component_type NOT NULL,
  label text NOT NULL CHECK (char_length(trim(label)) > 0),
  max_score numeric NOT NULL CHECK (max_score > 0),
  linked_assignment_id uuid,
  linked_quiz_id uuid,
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT gradebook_items_pkey PRIMARY KEY (id),
  CONSTRAINT gradebook_items_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT gradebook_items_linked_assignment_id_fkey FOREIGN KEY (linked_assignment_id) REFERENCES public.assignments(id),
  CONSTRAINT gradebook_items_linked_quiz_id_fkey FOREIGN KEY (linked_quiz_id) REFERENCES public.quizzes(id),
  CONSTRAINT gradebook_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  -- A column links to at most one source, never both.
  CONSTRAINT gradebook_items_single_link CHECK (
    linked_assignment_id IS NULL OR linked_quiz_id IS NULL
  )
);

CREATE TABLE public.gradebook_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gradebook_item_id uuid NOT NULL,
  student_id uuid NOT NULL,
  score numeric NOT NULL CHECK (score >= 0),
  graded_by uuid NOT NULL,
  graded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gradebook_scores_pkey PRIMARY KEY (id),
  CONSTRAINT gradebook_scores_gradebook_item_id_fkey FOREIGN KEY (gradebook_item_id) REFERENCES public.gradebook_items(id),
  CONSTRAINT gradebook_scores_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT gradebook_scores_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id),
  -- One score per student per column. A re-grade updates this row via
  -- upsert, it doesn't insert a second one.
  CONSTRAINT gradebook_scores_unique_item_student UNIQUE (gradebook_item_id, student_id)
);

CREATE INDEX gradebook_items_course_id_idx ON public.gradebook_items (course_id) WHERE deleted_at IS NULL;
CREATE INDEX gradebook_scores_item_id_idx ON public.gradebook_scores (gradebook_item_id);

ALTER TABLE public.gradebook_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gradebook_scores ENABLE ROW LEVEL SECURITY;

-- Teacher: full access to their own course's gradebook items.
CREATE POLICY gradebook_items_teacher_all ON public.gradebook_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = gradebook_items.course_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = gradebook_items.course_id AND c.teacher_id = auth.uid()
    )
  );

-- Admin: full access to every course's gradebook items — same
-- "admin edits underlying scores like a teacher would" decision
-- already applied to gradeSubmission/gradeShortAnswer.
CREATE POLICY gradebook_items_admin_all ON public.gradebook_items
  FOR ALL
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- Student: read-only, only their own enrolled course's items (so the
-- student grades page, if it ever shows this, can't see other courses).
CREATE POLICY gradebook_items_student_select ON public.gradebook_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = gradebook_items.course_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- Teacher: full access to scores on their own course's items.
CREATE POLICY gradebook_scores_teacher_all ON public.gradebook_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gradebook_items gi
      JOIN courses c ON c.id = gi.course_id
      WHERE gi.id = gradebook_scores.gradebook_item_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gradebook_items gi
      JOIN courses c ON c.id = gi.course_id
      WHERE gi.id = gradebook_scores.gradebook_item_id AND c.teacher_id = auth.uid()
    )
  );

-- Admin: full access to every score, same reasoning as above.
CREATE POLICY gradebook_scores_admin_all ON public.gradebook_scores
  FOR ALL
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- Student: can see only their own scores.
CREATE POLICY gradebook_scores_student_select ON public.gradebook_scores
  FOR SELECT
  USING (student_id = auth.uid());
