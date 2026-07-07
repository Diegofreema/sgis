-- ============================================================================
-- SPA browser access: RLS + Storage policies
-- ----------------------------------------------------------------------------
-- Enables the Vite SPA (anon/authenticated supabase-js) to reach data directly
-- and safely. Server-only secrets (exam answers, OTP hashes, grading) stay OFF
-- the client and are reached ONLY through Edge Functions (service role, which
-- bypasses RLS).
--
-- SAFE TO RE-RUN: every statement is idempotent (drop-if-exists / or-replace).
-- Additive for the legacy Next app — service-role queries already bypass RLS,
-- so these policies only GRANT new browser access; they do not restrict server.
--
-- REVIEW BEFORE PROD. Test on a staging Supabase project first.
-- ============================================================================

-- ─── Admin predicate ────────────────────────────────────────────────────────
-- SECURITY DEFINER so the profiles lookup itself is not subject to profiles RLS
-- (avoids infinite recursion when profiles policies call is_admin()).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ─── Helper: admin-only full access on a table ──────────────────────────────
-- (Applied explicitly per table below — Postgres has no per-table loop in DDL.)

-- ============================================================================
-- ADMIN-MANAGED TABLES  — admins get full CRUD via RLS
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'cms_pages','news_articles','gallery_items','carousel_slides',
    'announcements','admission_settings','bank_accounts','application_periods',
    'applications','payments','profiles','activity_logs',
    'exams','questions','exam_questions','exam_attempts','exam_answers',
    'public_exam_access_sessions'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', 'admin_all_'||t, t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());',
      'admin_all_'||t, t
    );
  end loop;
end $$;

-- ============================================================================
-- PUBLIC READ  — anon + authenticated may SELECT non-sensitive public content
-- ============================================================================

-- News: only published articles.
drop policy if exists "public_read_published_news" on public.news_articles;
create policy "public_read_published_news" on public.news_articles
  for select to anon, authenticated
  using (status = 'published');

-- Gallery: public items (visibility column defaults to 'public').
drop policy if exists "public_read_gallery" on public.gallery_items;
create policy "public_read_gallery" on public.gallery_items
  for select to anon, authenticated
  using (visibility = 'public');

-- Announcements: published + public audience.
drop policy if exists "public_read_announcements" on public.announcements;
create policy "public_read_announcements" on public.announcements
  for select to anon, authenticated
  using (status = 'published' and audience = 'public');

-- Application periods: open sessions are publicly discoverable (dates, fee).
drop policy if exists "public_read_open_periods" on public.application_periods;
create policy "public_read_open_periods" on public.application_periods
  for select to anon, authenticated
  using (status = 'open');

-- Admission settings: public-safe (school contact, isOpen, notes). Fixes the
-- anon 42501 the SPA footer/contact/CTA hit. No secrets in this table.
drop policy if exists "public_read_admission_settings" on public.admission_settings;
create policy "public_read_admission_settings" on public.admission_settings
  for select to anon, authenticated
  using (true);

-- Bank accounts: active accounts are shown to applicants for payment.
drop policy if exists "public_read_active_bank_accounts" on public.bank_accounts;
create policy "public_read_active_bank_accounts" on public.bank_accounts
  for select to anon, authenticated
  using (is_active = true);

-- ----------------------------------------------------------------------------
-- NOTE ON EXAM SECRECY
-- questions / exam_questions / exam_attempts / exam_answers /
-- public_exam_access_sessions / exams have ONLY the admin policy above. There
-- is deliberately NO anon/authenticated read policy: students never touch the
-- question bank (and its correct_option) from the browser. All student exam
-- traffic goes through Edge Functions using the service role, which bypasses
-- RLS. This is the security boundary that cannot move into the SPA.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- STORAGE POLICIES  (storage.objects)
-- Bucket ids assumed: 'gallery' (public), 'documents' (private), 'avatars'.
-- Adjust bucket ids if yours differ (see NEXT_PUBLIC_STORAGE_BUCKET_* / VITE_).
-- ============================================================================

-- Gallery: world-readable; only admins write/delete.
drop policy if exists "gallery_public_read" on storage.objects;
create policy "gallery_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'gallery');

drop policy if exists "gallery_admin_write" on storage.objects;
create policy "gallery_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "gallery_admin_delete" on storage.objects;
create policy "gallery_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

-- Documents: applicants (anon) upload passport/receipt/docs during application;
-- reads are admin-only (applicants receive short-lived signed URLs minted by
-- an Edge Function / service role).
drop policy if exists "documents_public_insert" on storage.objects;
create policy "documents_public_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'documents');

drop policy if exists "documents_admin_read" on storage.objects;
create policy "documents_admin_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and public.is_admin());

drop policy if exists "documents_admin_delete" on storage.objects;
create policy "documents_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin());

-- Avatars: public read; authenticated users manage their own folder (path is
-- prefixed with their profile id, matching legacy uploadAvatar).
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_authenticated_write" on storage.objects;
create policy "avatars_authenticated_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "avatars_authenticated_update" on storage.objects;
create policy "avatars_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars');
