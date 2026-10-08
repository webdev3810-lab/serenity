-- Supabase schedules the existing protected Next.js iCal import endpoint.
-- Keep the job inactive until the matching secret is stored in Vault and Vercel.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.request_calendar_sync()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'calendar_sync_cron_secret';

  if cron_secret is null or length(cron_secret) < 32 then
    raise exception 'calendar_sync_cron_secret is missing or too short in Supabase Vault';
  end if;

  select net.http_get(
    url := 'https://www.serenityhomesdirect.com/api/cron/calendar-sync',
    headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret),
    timeout_milliseconds := 240000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function private.request_calendar_sync() from public, anon, authenticated;

select cron.schedule(
  'serenity-calendar-sync',
  '*/15 * * * *',
  'select private.request_calendar_sync()'
);

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'serenity-calendar-sync'),
  active := false
);
