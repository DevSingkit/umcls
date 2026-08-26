-- 20260826000001_085_assignment_submission_files.sql
--
-- Real schema change, per explicit product decision: assignment
-- submissions move from one file per submission to multiple files,
-- matching real Google Classroom (attach several files, remove any
-- of them individually). assignment_submissions.file_path/file_name
-- were a single-file design from the original schema.
--
-- assignment_submissions.file_path/file_name are NOT dropped here —
-- left in place, deprecated, for backward compatibility with any
-- reader not yet migrated to submission_files (e.g. a teacher grading
-- view component not yet updated in this pass). New code stops
-- writing to them (see submissions.ts), but they aren't assumed gone
-- until every reader is confirmed migrated — dropping them is a
-- follow-up migration once that's verified, not this one.

create table public.submission_files (
  id uuid not null default gen_random_uuid(),
  submission_id uuid not null,
  file_path text not null,
  file_name text not null,
  uploaded_at timestamp with time zone not null default now(),
  constraint submission_files_pkey primary key (id),
  constraint submission_files_submission_id_fkey foreign key (submission_id)
    references public.assignment_submissions(id) on delete cascade
);

create index submission_files_submission_id_idx on public.submission_files (submission_id);

alter table public.submission_files enable row level security;

-- Student: full access to files on their OWN submission only.
create policy submission_files_student_all on public.submission_files
  for all
  using (
    exists (
      select 1 from assignment_submissions s
      where s.id = submission_files.submission_id
        and s.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from assignment_submissions s
      where s.id = submission_files.submission_id
        and s.student_id = auth.uid()
    )
  );

-- Teacher: read-only, files on submissions to their own course's assignments.
create policy submission_files_teacher_select on public.submission_files
  for select
  using (
    exists (
      select 1 from assignment_submissions s
      join assignments a on a.id = s.assignment_id
      join courses c on c.id = a.course_id
      where s.id = submission_files.submission_id
        and c.teacher_id = auth.uid()
    )
  );

-- Admin: full access, same "admin acts like the owning teacher" pattern
-- used elsewhere in this app (gradebook, submission grading).
create policy submission_files_admin_all on public.submission_files
  for all
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

-- Backfill: every existing single-file submission becomes one row here.
insert into public.submission_files (submission_id, file_path, file_name, uploaded_at)
select id, file_path, file_name, submitted_at
from public.assignment_submissions
where file_path is not null;
