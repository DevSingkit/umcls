-- Creates the storage bucket for course/lesson materials, restricted
-- to the file types in PH3-003's spec (documents, images, media).
-- Executables, HTML, and anything else are blocked at the bucket
-- level via allowed_mime_types, in addition to the app-side check in
-- materials.ts — same "check it in two places" reasoning as
-- AUTH_NOTES.md.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  false,
  41943040, -- 40 MB, in bytes (40 * 1024 * 1024)
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

-- RLS on storage.objects for the 'materials' bucket.
-- Path convention enforced by the app: materials/{course_id}/{uuid}-{filename}

-- Teachers can upload/read/delete files for courses they own.
create policy "Teachers manage materials for their own courses"
on storage.objects for all
using (
  bucket_id = 'materials'
  and exists (
    select 1 from public.courses c
    where c.id::text = (storage.foldername(name))[1]
    and c.teacher_id = auth.uid()
  )
)
with check (
  bucket_id = 'materials'
  and exists (
    select 1 from public.courses c
    where c.id::text = (storage.foldername(name))[1]
    and c.teacher_id = auth.uid()
  )
);

-- Students can read (not write) materials for courses they're
-- actively enrolled in.
create policy "Students read materials for enrolled courses"
on storage.objects for select
using (
  bucket_id = 'materials'
  and exists (
    select 1 from public.enrollments e
    where e.course_id::text = (storage.foldername(name))[1]
    and e.student_id = auth.uid()
    and e.status = 'active'
  )
);

-- Admins can read/manage everything in the bucket (support, erasure).
create policy "Admins manage all materials"
on storage.objects for all
using (
  bucket_id = 'materials'
  and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
)
with check (
  bucket_id = 'materials'
  and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);
