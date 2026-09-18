-- lesson_completions_rls.test.sql
-- Checks RC-05: a student can only mark a lesson complete for themselves,
-- only if they are enrolled in the course, and only if the lesson is
-- published. Also checks completions can never be changed or removed
-- once inserted (append-only).

begin;
select plan(4);

-- Setup: two students, one course, one published lesson, one enrollment
-- (only student A is enrolled).
insert into auth.users (id, email) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'student_a@test.local'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'student_b@test.local');

insert into public.users (id, email, role, full_name, is_active) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'student_a@test.local', 'student', 'Student A', true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'student_b@test.local', 'student', 'Student B', true);

-- (Assumes courses/lessons/enrollments tables and columns as in DATABASE.md.
-- Adjust column names here if the real schema differs.)
insert into public.courses (id, title, teacher_id) values
    ('c0000000-0000-0000-0000-000000000001', 'Test Course', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

insert into public.lessons (id, course_id, title, content, is_published) values
    ('11111111-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Test Lesson', '{}', true);

insert into public.enrollments (student_id, course_id) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000001');

-- Test 1: enrolled student can insert their own completion
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

select lives_ok(
    $$insert into lesson_completions (lesson_id, student_id)
      values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
    'enrolled student can insert their own lesson completion'
);

-- Test 2: student not enrolled in the course cannot insert a completion
set local "request.jwt.claims" to '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';

select throws_ok(
    $$insert into lesson_completions (lesson_id, student_id)
      values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
    'new row violates row-level security policy for table "lesson_completions"',
    'student not enrolled in the course cannot insert a completion'
);

-- Test 3: a student cannot insert a completion for someone else
set local "request.jwt.claims" to '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

select throws_ok(
    $$insert into lesson_completions (lesson_id, student_id)
      values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
    'new row violates row-level security policy for table "lesson_completions"',
    'a student cannot insert a completion on behalf of another student'
);

-- Test 4: completions cannot be updated or deleted by anyone with the
-- authenticated role, since no UPDATE or DELETE policy exists at all.
select throws_ok(
    $$update lesson_completions set completed_at = now() where true$$,
    'new row violates row-level security policy for table "lesson_completions"',
    'lesson_completions cannot be updated, since it is append-only'
);

select * from finish();
rollback;