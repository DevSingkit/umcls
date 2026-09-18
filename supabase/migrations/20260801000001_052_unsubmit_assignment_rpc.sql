-- 052: unsubmit_assignment RPC
--
-- Lets a student delete their own, not-yet-graded assignment submission
-- so they can start over. assignment_submissions has no DELETE policy
-- for students today (only teachers can read/grade via RLS), and there
-- is no soft-delete column on this table to fall back on, unlike
-- lessons/quizzes/assignments/materials.
--
-- Rather than add a raw RLS DELETE policy and hope its WITH CHECK
-- behaves (see SECURITY.md §3 / DATABASE.md §3 on why the
-- delete_lesson/delete_quiz/delete_assignment/delete_material RPCs
-- exist at all -- RLS WITH CHECK has previously rejected verified-owner
-- soft-delete UPDATEs in this codebase), this follows that same
-- established pattern: an explicit ownership + status check inside a
-- SECURITY DEFINER function.
--
-- Business-rule gating (is the due date passed, is late submission
-- allowed) is deliberately NOT done here -- that lives in the calling
-- Server Action (features/assignments/actions/submissions.ts), matching
-- how the other four delete_* RPCs only check ownership, never
-- higher-level rules like publish state. This function only prevents
-- deleting a submission that's already been graded or returned, since
-- doing so would destroy grade history with no trace.

create or replace function public.unsubmit_assignment(p_submission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted boolean;
begin
  delete from public.assignment_submissions
  where id = p_submission_id
    and student_id = auth.uid()
    and status not in ('graded', 'returned')
  returning true into v_deleted;

  return coalesce(v_deleted, false);
end;
$$;

grant execute on function public.unsubmit_assignment(uuid) to authenticated;
