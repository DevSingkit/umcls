-- 20260616_015_indexes.sql
-- Source: DATABASE.md §4 Indexes

-- users
create index idx_users_role           on users(role);
create index idx_users_email_trgm     on users using gin(email gin_trgm_ops);
create index idx_users_full_name_trgm on users using gin(full_name gin_trgm_ops);
create index idx_users_is_active      on users(is_active) where deleted_at is null;

-- courses
create index idx_courses_teacher_id   on courses(teacher_id);
create index idx_courses_published    on courses(is_published) where deleted_at is null;

-- enrollments
create index idx_enrollments_student  on enrollments(student_id);
create index idx_enrollments_course   on enrollments(course_id);
create index idx_enrollments_status   on enrollments(status);

-- lessons
create index idx_lessons_course_id    on lessons(course_id, order_index) where deleted_at is null;
create index idx_lessons_published    on lessons(is_published) where deleted_at is null;

-- materials
create index idx_materials_lesson_id  on materials(lesson_id) where deleted_at is null;
create index idx_materials_course_id  on materials(course_id) where deleted_at is null;

-- assignments
create index idx_assignments_course   on assignments(course_id) where deleted_at is null;
create index idx_assignments_due_at   on assignments(due_at) where deleted_at is null;

-- assignment_submissions
create index idx_submissions_assignment on assignment_submissions(assignment_id);
create index idx_submissions_student    on assignment_submissions(student_id);
create index idx_submissions_status     on assignment_submissions(status);

-- quizzes
create index idx_quizzes_course_id    on quizzes(course_id) where deleted_at is null;

-- question_bank
create index idx_qbank_created_by     on question_bank(created_by);
create index idx_qbank_tags           on question_bank using gin(competency_tags);

-- questions
create index idx_questions_quiz_id    on questions(quiz_id, order_index);

-- quiz_attempts
create index idx_attempts_quiz_id     on quiz_attempts(quiz_id);
create index idx_attempts_student_id  on quiz_attempts(student_id);
create index idx_attempts_status      on quiz_attempts(status);

-- grades
create index idx_grades_course_id     on grades(course_id);
create index idx_grades_student_id    on grades(student_id);

-- mastery_records
create index idx_mastery_student      on mastery_records(student_id, course_id);
create index idx_mastery_competency   on mastery_records(competency_tag);

-- recommendations
create index idx_recs_student_id      on recommendations(student_id) where is_dismissed = false;
create index idx_recs_course_id       on recommendations(course_id);

-- notifications
create index idx_notif_user_id        on notifications(user_id, is_read, created_at desc);

-- audit_logs
create index idx_audit_actor_id       on audit_logs(actor_id);
create index idx_audit_created_at     on audit_logs(created_at desc);
create index idx_audit_action         on audit_logs(action);
create index idx_audit_target         on audit_logs(target_table, target_id);

-- NOTE: idx_quiz_responses_attempt / idx_quiz_responses_question were already
-- created inline in 009_attempts_responses.sql (DATABASE.md lists them
-- immediately after the quiz_responses table, ahead of this section) —
-- not repeated here to avoid a duplicate-index error.
