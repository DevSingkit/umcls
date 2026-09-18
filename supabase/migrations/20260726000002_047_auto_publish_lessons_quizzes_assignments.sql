-- 047_auto_publish_lessons_quizzes_assignments.sql
-- Lessons, quizzes, and assignments are now visible to students the
-- moment they're created — no more draft/publish step for these three
-- item types. (Course-level publish/unpublish is unaffected — that
-- stays as a deliberate teacher action via CourseMenu.)
alter table lessons alter column is_published set default true;
alter table quizzes alter column is_published set default true;
alter table assignments alter column is_published set default true;

-- Anything currently sitting as an unpublished draft becomes visible
-- too, so there's nothing stuck behind a control that no longer
-- exists in the UI.
update lessons set is_published = true where is_published = false and deleted_at is null;
update quizzes set is_published = true where is_published = false and deleted_at is null;
update assignments set is_published = true where is_published = false and deleted_at is null;
