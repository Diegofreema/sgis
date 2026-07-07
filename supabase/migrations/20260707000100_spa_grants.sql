-- ============================================================================
-- Table privilege grants for the SPA roles.
-- ----------------------------------------------------------------------------
-- RLS policies only decide WHICH ROWS a role sees; the role must first hold the
-- table-level privilege or Postgres rejects the query with 42501 before RLS is
-- evaluated. The legacy "lock server-only tables" migrations REVOKED select on
-- admission_settings + bank_accounts from anon, so the public-read policies in
-- 20260707000000 never got a chance to run. Restore the needed grants here.
--
-- Safe: privileges are still gated by the RLS policies (public-read predicates
-- for anon; is_admin() for the admin-managed tables).
-- ============================================================================

-- Public-safe tables anon must read (school contact, payment bank details).
grant select on public.admission_settings to anon, authenticated;
grant select on public.bank_accounts to anon, authenticated;

-- Admins act as the `authenticated` role; ensure CRUD privileges exist so the
-- admin_all (is_admin()) policies are reachable. Non-admins hold the grant but
-- RLS returns no rows, so this exposes nothing.
grant select, insert, update, delete on
  public.cms_pages,
  public.news_articles,
  public.gallery_items,
  public.carousel_slides,
  public.announcements,
  public.admission_settings,
  public.bank_accounts,
  public.application_periods,
  public.applications,
  public.payments,
  public.profiles,
  public.activity_logs,
  public.exams,
  public.questions,
  public.exam_questions,
  public.exam_attempts,
  public.exam_answers,
  public.public_exam_access_sessions
  to authenticated;
