-- Bucket for student assignment submissions. Same allowed types/size
-- as materials, but different access model: a student can only
-- read/write their OWN submission folder; the owning teacher can read
-- all submissions for their course's assignments.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  41943040, -- 40 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'video/mp4'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention enforced by the app: submissions/{assignment_id}/{student_id}/{uuid}-{filename}

-- Students manage (upload/read/overwrite) only their own submission folder.
create policy "Students manage their own submission files"
on storage.objects for all
using (
  bucket_id = 'submissions'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'submissions'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Teachers can read submission files for assignments in courses they own.
create policy "Teachers read submissions for their own course assignments"
on storage.objects for select
using (
  bucket_id = 'submissions'
  and exists (
    select 1 from public.assignments a
    join public.courses c on c.id = a.course_id
    where a.id::text = (storage.foldername(name))[1]
    and c.teacher_id = auth.uid()
  )
);

-- Admins can manage everything (support, erasure).
create policy "Admins manage all submission files"
on storage.objects for all
using (
  bucket_id = 'submissions'
  and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
)
with check (
  bucket_id = 'submissions'
  and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);
