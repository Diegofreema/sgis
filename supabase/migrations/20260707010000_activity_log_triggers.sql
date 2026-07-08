-- ============================================================================
-- Activity-log audit triggers
-- ----------------------------------------------------------------------------
-- Automatically records every INSERT/UPDATE/DELETE performed by an authenticated
-- ADMIN on the admin-managed tables into public.activity_logs. Coverage is
-- complete and tamper-resistant: the SPA can't skip it (it's in the database),
-- and there's no per-call logging to forget in the app layer.
--
-- SCOPING: the trigger resolves the actor from auth.uid(). Writes with no admin
-- profile (service-role Edge Functions, anonymous applicants) are NOT logged
-- here — those paths (exam grading, application submission) run as the service
-- role with auth.uid() = null, so they're skipped. The two privileged admin
-- Edge Functions (review-application, admin-create-user) also run as the service
-- role and therefore log explicitly inside the function to capture the actor.
--
-- SAFE TO RE-RUN: create-or-replace fn + drop-if-exists triggers.
-- ============================================================================

-- ─── Audit trigger function ─────────────────────────────────────────────────
-- SECURITY DEFINER so the insert into activity_logs bypasses that table's RLS
-- (the actor is only `authenticated`, which has no direct insert grant there).
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
  v_meta  jsonb := null;
begin
  -- Who did it? Only log actions by an admin profile; skip everything else
  -- (service role, anon applicants) so this table stays an admin audit trail.
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

  -- For updates, record which columns changed (names only — no values, so no
  -- PII lands in the log). Ignore updated_at churn.
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
  values (v_actor, v_role, TG_TABLE_NAME || '.' || v_verb, TG_TABLE_NAME, v_row.id, v_meta);

  return v_row;
end;
$$;

-- ─── Attach to admin-managed tables ─────────────────────────────────────────
-- Content/config the admin manages directly from the SPA. Excludes the exam
-- runtime tables (exam_attempts / exam_answers / public_exam_access_sessions),
-- which are written only by the service role, and activity_logs itself.
do $$
declare t text;
begin
  foreach t in array array[
    'cms_pages','news_articles','gallery_items','carousel_slides',
    'announcements','admission_settings','bank_accounts','application_periods',
    'applications','payments','profiles',
    'exams','questions','exam_questions'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I;', 'trg_audit_'||t, t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I '
      || 'for each row execute function public.log_activity();',
      'trg_audit_'||t, t
    );
  end loop;
end $$;
