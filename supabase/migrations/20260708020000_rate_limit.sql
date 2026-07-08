-- ============================================================================
-- Fixed-window rate limiter for public (anon) Edge Functions.
-- ----------------------------------------------------------------------------
-- submit-application creates rows, uploads files and sends email with no auth,
-- so a script with fresh emails could exhaust storage/DB/Resend quota. This
-- gives the function a cheap atomic throttle keyed by client IP.
--
-- Called only by Edge Functions (service role). Not exposed to anon/auth.
-- SAFE TO RE-RUN: idempotent.
-- ============================================================================

create table if not exists public.rate_limits (
  key          text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;  -- no policies: service role only

-- Atomic check-and-increment. Returns true when the call is WITHIN the limit
-- (allowed), false when it exceeds p_max within the p_window_seconds window.
create or replace function public.hit_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as rl (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
          when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else rl.count + 1
        end,
        window_start = case
          when rl.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else rl.window_start
        end
  returning rl.count into v_count;

  return v_count <= p_max;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
