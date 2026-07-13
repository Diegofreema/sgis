create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null,
  content text not null,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_public_idx
  on public.testimonials (is_published, created_at desc);

alter table public.testimonials enable row level security;

drop policy if exists "admin_all_testimonials" on public.testimonials;
create policy "admin_all_testimonials" on public.testimonials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public_read_published_testimonials" on public.testimonials;
create policy "public_read_published_testimonials" on public.testimonials
  for select to anon, authenticated
  using (is_published = true);

grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

drop trigger if exists trg_audit_testimonials on public.testimonials;
create trigger trg_audit_testimonials
  after insert or update or delete on public.testimonials
  for each row execute function public.log_activity();
