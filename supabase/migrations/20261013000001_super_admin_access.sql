create unique index if not exists profiles_single_super_admin
  on public.profiles (role)
  where role = 'super_admin';

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
      and p.role in ('admin', 'super_admin')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and auth.uid() is not null
    and not exists (
      select 1
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.role = 'super_admin'
    ) then
    raise exception 'Only the super admin can change profile roles.';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_profile_role_change() from public;
grant execute on function public.guard_profile_role_change() to authenticated, service_role;

drop trigger if exists guard_profile_role_change on public.profiles;
create trigger guard_profile_role_change
  before update of role on public.profiles
  for each row execute function public.guard_profile_role_change();

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_role public.user_role;
  v_verb text;
  v_row record;
  v_id uuid;
  v_meta jsonb := null;
begin
  select p.id, p.role into v_actor, v_role
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.role in ('admin', 'super_admin');

  if v_actor is null then
    return coalesce(NEW, OLD);
  end if;

  v_verb := case TG_OP
    when 'INSERT' then 'created'
    when 'UPDATE' then 'updated'
    when 'DELETE' then 'deleted'
  end;

  v_row := coalesce(NEW, OLD);
  v_id := (to_jsonb(v_row) ->> 'id')::uuid;

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
