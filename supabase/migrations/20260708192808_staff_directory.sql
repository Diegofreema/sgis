create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  image_url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_members_public_idx
  on public.staff_members (is_active, sort_order, created_at desc);

alter table public.staff_members enable row level security;

drop policy if exists "admin_all_staff_members" on public.staff_members;
create policy "admin_all_staff_members" on public.staff_members
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public_read_active_staff_members" on public.staff_members;
create policy "public_read_active_staff_members" on public.staff_members
  for select to anon, authenticated
  using (is_active = true);

grant select on public.staff_members to anon, authenticated;
grant insert, update, delete on public.staff_members to authenticated;

drop trigger if exists trg_audit_staff_members on public.staff_members;
create trigger trg_audit_staff_members
  after insert or update or delete on public.staff_members
  for each row execute function public.log_activity();
