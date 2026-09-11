-- Allows a material to be an external cloud link (e.g. a Google Drive
-- or YouTube URL) instead of an uploaded file. storage_path becomes
-- nullable since a link-type material has no file in the bucket.
alter table public.materials
  alter column storage_path drop not null,
  alter column file_size_bytes drop not null;

alter table public.materials
  add column external_url text;

alter table public.materials
  add constraint materials_file_or_link_check
  check (
    (storage_path is not null and external_url is null)
    or (storage_path is null and external_url is not null)
  );
