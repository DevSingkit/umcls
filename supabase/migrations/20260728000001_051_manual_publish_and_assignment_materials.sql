-- 051_manual_publish_quiz_assignment_and_assignment_materials.sql
--
-- Part 1: Reverts migration 047's auto-publish for quizzes and
-- assignments specifically. Lessons are NOT touched here — they keep
-- auto-publish exactly as migration 047 left them. Going forward, a
-- teacher creates a quiz/assignment (still just a title, same as
-- today), edits it (adds questions / instructions+attachments), then
-- explicitly clicks "Post" on the edit page — no more publish-the-
-- instant-it's-created for these two item types.
--
-- Existing rows are deliberately left as-is (not force-unpublished) —
-- anything already auto-published under migration 047 stays visible
-- to students. Only the column DEFAULT changes, which only affects
-- rows inserted after this migration runs.
alter table quizzes alter column is_published set default false;
alter table assignments alter column is_published set default false;

-- Part 2: Assignments can now have materials attached, same as
-- lessons. materials.lesson_id is already nullable and scoped via
-- course_id; assignment_id follows the identical pattern.
alter table materials add column assignment_id uuid;
alter table materials add constraint materials_assignment_id_fkey
  foreign key (assignment_id) references assignments(id);

-- A material should belong to at most one of lesson_id / assignment_id
-- (or neither, if it's a course-level material) — never both at once.
alter table materials add constraint materials_single_owner_check
  check (not (lesson_id is not null and assignment_id is not null));
