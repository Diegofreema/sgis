-- ============================================================================
-- Security hardening + query-optimization helpers
-- ----------------------------------------------------------------------------
-- Follow-up to 20260707000000 (RLS), 20260707000100 (grants) and
-- 20260707010000 (audit triggers). Fixes found in the security/efficiency audit:
--
--   F1  activity_logs was FOR ALL to authenticated  -> admins could DELETE/forge
--       their own audit trail. Make it append-only: SELECT for admins, writes
--       only via the SECURITY DEFINER trigger (and the superuser cron purge).
--   F4  log_activity() read v_row.id, but exam_questions has a composite PK and
--       no `id` column -> every exam_questions write aborted. Null-safe the id.
--   F2  avatars storage: any authenticated user could overwrite ANY avatar, and
--       the UPDATE policy had no WITH CHECK. Scope writes to admins (the only
--       role that logs in) — matches the gallery policy.
--   F3  documents bucket had a public (anon) INSERT policy, but applicant
--       uploads go through the submit-application Edge Function (service role,
--       bypasses RLS). The browser never inserts here -> drop the dead policy.
--
--   Plus two SECURITY INVOKER count RPCs so the dashboard and exams list stop
--   downloading whole tables to count rows in JS (RLS still applies: non-admins
--   get nothing, admins get real aggregates in a single round-trip).
--
-- SAFE TO RE-RUN: every statement is idempotent.
-- ============================================================================

-- ─── F1: activity_logs is append-only (admin-readable, trigger-writable) ─────
drop policy if exists "admin_all_activity_logs" on public.activity_logs;

drop policy if exists "admin_read_activity_logs" on public.activity_logs;
create policy "admin_read_activity_logs" on public.activity_logs
  for select to authenticated
  using (public.is_admin());

-- No direct writes from the browser. The log_activity() trigger is SECURITY
-- DEFINER (runs as the table owner, bypassing RLS) and the pg_cron purge runs
-- as superuser, so both keep working without this grant.
revoke insert, update, delete on public.activity_logs from authenticated;

-- ─── F4: null-safe entity id in the audit trigger (composite-PK tables) ──────
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_role  public.user_role;
  v_verb  text;
  v_row   record;
  v_id    uuid;
  v_meta  jsonb := null;
begin
  select p.id, p.role into v_actor, v_role
  from public.profiles p
  where p.auth_user_id = auth.uid() and p.role = 'admin';

  if v_actor is null then
    return coalesce(NEW, OLD);
  end if;

  v_verb := case TG_OP
    when 'INSERT' then 'created'
    when 'UPDATE' then 'updated'
    when 'DELETE' then 'deleted'
  end;

  v_row := coalesce(NEW, OLD);
  -- Tables with a composite PK (e.g. exam_questions) have no `id` column;
  -- pull it null-safely so the trigger never aborts the statement.
  v_id  := (to_jsonb(v_row) ->> 'id')::uuid;

  if TG_OP = 'UPDATE' then
    select jsonb_build_object(
      'changed',
      coalesce(jsonb_agg(n.key order by n.key), '[]'::jsonb)
    )
    into v_meta
    from jsonb_each(to_jsonb(NEW)) n
    join jsonb_each(to_jsonb(OLD)) o on o.key = n.key
    where n.value is distinct from o.value
      and n.key <> 'updated_at';
  end if;

  insert into public.activity_logs (actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (v_actor, v_role, TG_TABLE_NAME || '.' || v_verb, TG_TABLE_NAME, v_id, v_meta);

  return v_row;
end;
$$;

-- ─── F2: avatars writable only by admins (the only role that authenticates) ──
drop policy if exists "avatars_authenticated_write" on storage.objects;
create policy "avatars_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.is_admin());

drop policy if exists "avatars_authenticated_update" on storage.objects;
create policy "avatars_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.is_admin())
  with check (bucket_id = 'avatars' and public.is_admin());

-- ─── F3: drop the dead public INSERT policy on the documents bucket ──────────
-- Applicant uploads run through submit-application (service role); the browser
-- never inserts here. Admin read/delete policies are unchanged.
drop policy if exists "documents_public_insert" on storage.objects;

-- ============================================================================
-- Count RPCs (SECURITY INVOKER -> RLS applies to the caller)
-- ============================================================================

-- Application counts per status, optionally scoped to one period. Replaces the
-- dashboard pulling every applications row to bucket in JS.
create or replace function public.application_status_counts(p_period uuid default null)
returns table (status text, count bigint)
language sql
stable
set search_path = public
as $$
  select a.status::text, count(*)
  from public.applications a
  where p_period is null or a.application_period_id = p_period
  group by a.status;
$$;

revoke all on function public.application_status_counts(uuid) from public;
grant execute on function public.application_status_counts(uuid) to authenticated;

-- Attempt counts per exam. Replaces the exams list downloading the whole
-- exam_attempts table to count in JS.
create or replace function public.exam_attempt_counts()
returns table (exam_id uuid, count bigint)
language sql
stable
set search_path = public
as $$
  select ea.exam_id, count(*)
  from public.exam_attempts ea
  group by ea.exam_id;
$$;

revoke all on function public.exam_attempt_counts() from public;
grant execute on function public.exam_attempt_counts() to authenticated;
