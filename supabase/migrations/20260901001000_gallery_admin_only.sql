-- Gallery writes were admin-only in name only. The legacy policies from
-- 20260602074932_remote_applied.sql let ANY authenticated user insert/delete in
-- the gallery bucket, and RLS policies are permissive (OR'd), so they bypassed
-- the is_admin() checks added in 20260707000000. Drop them; the gallery_admin_*
-- pair is the real rule. Also drops the duplicate public-read policy.
drop policy if exists "gallery_insert_authenticated" on storage.objects;
drop policy if exists "gallery_delete_authenticated" on storage.objects;
drop policy if exists "gallery_update_authenticated" on storage.objects;
drop policy if exists "gallery_select_public" on storage.objects;
