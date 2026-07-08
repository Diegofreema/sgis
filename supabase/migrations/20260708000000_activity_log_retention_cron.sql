-- ============================================================================
-- Activity-log retention: purge rows older than 90 days, daily via pg_cron.
-- ----------------------------------------------------------------------------
-- Keeps the audit trail from growing without bound. pg_cron runs in the
-- `postgres` database as a superuser job, so the delete bypasses RLS.
--
-- SAFE TO RE-RUN: extension is if-not-exists; the job is unscheduled then
-- rescheduled so the schedule/command stay in sync on every apply.
-- ============================================================================

create extension if not exists pg_cron;

-- Drop any previous version of the job so re-applying updates it cleanly.
select cron.unschedule('purge-old-activity-logs')
where exists (select 1 from cron.job where jobname = 'purge-old-activity-logs');

-- 03:00 UTC daily.
select cron.schedule(
  'purge-old-activity-logs',
  '0 3 * * *',
  $$ delete from public.activity_logs where created_at < now() - interval '90 days' $$
);
