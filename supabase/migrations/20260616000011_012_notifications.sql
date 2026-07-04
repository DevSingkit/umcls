-- 20260616_012_notifications.sql
-- Source: DATABASE.md §3.18 notifications
-- In-app notifications. Supabase Realtime broadcasts changes to the client.
--
-- NOTE: the 'reteach_lesson_available' and 'student_below_passing_score'
-- type values are included here (they're cheap to allow at the CHECK-
-- constraint level even though nothing in V1 writes them yet — the
-- corresponding triggers ship in migration 029 alongside reteach_lessons).

create table notifications (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id) on delete cascade,
    type            text not null check (type in (
                        'assignment_graded', 'submission_received', 'quiz_available',
                        'assignment_due_soon', 'course_published', 'assignment_published',
                        'reteach_lesson_available', 'student_below_passing_score', 'general'
                    )),
    title           text not null,
    body            text,
    link            text check (link is null or link ~ '^/'),  -- must be relative path (FIND-019)
    is_read         boolean not null default false,
    read_at         timestamptz,
    created_at      timestamptz not null default now()
);
