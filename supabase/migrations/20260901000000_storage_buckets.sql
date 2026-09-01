-- Storage buckets. The RLS policies in 20260707000000_spa_browser_rls.sql and
-- 20260708010000_security_hardening.sql reference these bucket ids, but the
-- buckets themselves were never created — every upload failed with
-- "Bucket not found". Also drops the `avatars` policies: no code path uses it.

-- gallery: public read (getPublicUrl), admin write. Uploaded straight from the
-- browser, so bucket limits are the only server-side guard on size/type.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery', 'gallery', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- documents: private (admin reads via signed URLs). submit-application already
-- validates size/type server-side; the 500KB cap mirrors MAX_DOC_BYTES.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 512000,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- avatars: unused bucket, drop its leftover policies.
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_authenticated_write" on storage.objects;
drop policy if exists "avatars_authenticated_update" on storage.objects;
drop policy if exists "avatars_admin_write" on storage.objects;
drop policy if exists "avatars_admin_update" on storage.objects;
