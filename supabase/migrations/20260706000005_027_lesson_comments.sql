-- Per-lesson comment threads (Google Classroom style). Any enrolled
-- student or the owning teacher can post; a person can delete their
-- own comment; the teacher can also delete any comment on their own
-- lesson (moderation).
create table public.lesson_comments (
  id uuid not null default gen_random_uuid(),
  lesson_id uuid not null,
  author_id uuid not null,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  constraint lesson_comments_pkey primary key (id),
  constraint lesson_comments_lesson_id_fkey foreign key (lesson_id) references public.lessons(id),
  constraint lesson_comments_author_id_fkey foreign key (author_id) references public.users(id)
);

create index lesson_comments_lesson_id_idx on public.lesson_comments (lesson_id, created_at);

alter table public.lesson_comments enable row level security;

-- Teacher who owns the lesson's course can read/insert/delete any
-- comment on it (moderation).
create policy "Teachers manage comments on their own lessons"
on public.lesson_comments for all
using (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_comments.lesson_id
    and c.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_comments.lesson_id
    and c.teacher_id = auth.uid()
  )
);

-- Enrolled students can read all comments on a lesson in their course...
create policy "Enrolled students read lesson comments"
on public.lesson_comments for select
using (
  exists (
    select 1 from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_comments.lesson_id
    and e.student_id = auth.uid()
    and e.status = 'active'
  )
);

-- ...and post their own.
create policy "Enrolled students post lesson comments"
on public.lesson_comments for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_comments.lesson_id
    and e.student_id = auth.uid()
    and e.status = 'active'
  )
);

-- Anyone (teacher or student) can soft-delete their own comment.
create policy "Authors delete their own comment"
on public.lesson_comments for update
using (author_id = auth.uid())
with check (author_id = auth.uid());
