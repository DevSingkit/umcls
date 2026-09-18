-- 20260803_059_course_archiving.sql
--
-- Adds course archiving, deliberately separate from the existing
-- deleted_at soft-delete. A deleted course is fully hidden from
-- everyone (see delete_course RPC and courses_select_* policies,
-- all gated on deleted_at is null). An archived course is the
-- opposite kind of hidden: it stays fully readable by its owning
-- teacher and enrolled students (all existing lessons/quizzes/
-- assignments/grades remain reachable), it's just no longer shown on
-- their dashboard's course list — reachable instead via a dedicated
-- "Archived" nav destination. No RLS change needed for this: every
-- courses_select_* policy already only checks deleted_at, and
-- archived_at is a purely application-level filter applied in
-- getMyCourses / getMyEnrolledCourses (which courses).
--
-- Admin-only to set or unset — no teacher-facing "archive my own
-- course" action, unlike is_published, which a teacher already
-- controls themselves via toggleCoursePublish. Enforced at the
-- application layer (features/admin/actions), not RLS, same as the
-- existing courses_update policy already allows an admin to update
-- any course's teacher_id (course reassignment) without a separate
-- table-level restriction distinguishing that from other course
-- fields.

alter table public.courses
    add column archived_at timestamptz;
