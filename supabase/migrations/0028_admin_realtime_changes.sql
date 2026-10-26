-- Send only the changed table name to admin clients. The source rows remain
-- protected by their existing RLS policies and are fetched by the admin UI.
create table if not exists public.admin_change_versions (
  source_table text primary key check (source_table in ('bookings', 'enquiries', 'contact_messages')),
  version bigint not null default 0,
  changed_at timestamptz not null default now()
);

alter table public.admin_change_versions enable row level security;
revoke all on public.admin_change_versions from public, anon, authenticated;
grant select on public.admin_change_versions to authenticated;

drop policy if exists "Admins can read change versions" on public.admin_change_versions;
create policy "Admins can read change versions"
  on public.admin_change_versions for select to authenticated
  using (public.is_admin());

insert into public.admin_change_versions (source_table)
values ('bookings'), ('enquiries'), ('contact_messages')
on conflict (source_table) do nothing;

create or replace function public.notify_admin_operational_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_change_versions (source_table, version, changed_at)
  values (TG_TABLE_NAME, 1, now())
  on conflict (source_table) do update
    set version = public.admin_change_versions.version + 1,
        changed_at = excluded.changed_at;
  return null;
end;
$$;

revoke all on function public.notify_admin_operational_change() from public, anon, authenticated;

drop trigger if exists bookings_admin_change on public.bookings;
create trigger bookings_admin_change
  after insert or update or delete on public.bookings
  for each row execute function public.notify_admin_operational_change();

drop trigger if exists enquiries_admin_change on public.enquiries;
create trigger enquiries_admin_change
  after insert or update or delete on public.enquiries
  for each row execute function public.notify_admin_operational_change();

drop trigger if exists contact_messages_admin_change on public.contact_messages;
create trigger contact_messages_admin_change
  after insert or update or delete on public.contact_messages
  for each row execute function public.notify_admin_operational_change();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_change_versions'
  ) then
    alter publication supabase_realtime add table public.admin_change_versions;
  end if;
end;
$$;
