-- Calendar sync is additive. It keeps imported availability separate from
-- customer bookings and never stores third-party calendar credentials.

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  platform text not null check (platform in ('direct', 'airbnb', 'vrbo', 'stayz')),
  connection_type text not null check (connection_type in ('export', 'import')),
  external_calendar_url text,
  export_token_hash text,
  is_enabled boolean not null default true,
  last_synced_at timestamptz,
  last_success_at timestamptz,
  last_error text not null default '',
  sync_status text not null default 'not_configured' check (sync_status in ('not_configured', 'pending', 'success', 'error', 'conflict')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (property_id, platform, connection_type),
  check (external_calendar_url is null or char_length(external_calendar_url) <= 2048),
  check (export_token_hash is null or char_length(export_token_hash) = 64)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  connection_id uuid references public.calendar_connections(id) on delete cascade,
  source_platform text not null check (source_platform in ('direct', 'airbnb', 'vrbo', 'stayz')),
  external_event_id text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'stale')),
  summary text not null default '',
  is_blocking boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (property_id, source_platform, external_event_id),
  check (end_date > start_date),
  check (char_length(summary) <= 160)
);

create index if not exists calendar_connections_property_idx
  on public.calendar_connections (property_id, platform, connection_type);
create index if not exists calendar_events_property_dates_idx
  on public.calendar_events (property_id, start_date, end_date)
  where is_blocking = true and status = 'active';
create index if not exists calendar_events_connection_idx
  on public.calendar_events (connection_id, external_event_id);

drop trigger if exists set_calendar_connections_updated_at on public.calendar_connections;
create trigger set_calendar_connections_updated_at
before update on public.calendar_connections
for each row execute function public.set_updated_at();

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

alter table public.calendar_connections enable row level security;
alter table public.calendar_events enable row level security;

drop policy if exists "Admins manage calendar connections" on public.calendar_connections;
create policy "Admins manage calendar connections" on public.calendar_connections
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage calendar events" on public.calendar_events;
create policy "Admins manage calendar events" on public.calendar_events
for all using (public.is_admin()) with check (public.is_admin());

-- This closes the race between an imported block and a new/updated booking.
-- The existing booking exclusion constraint continues to protect booking-vs-booking races.
create or replace function public.prevent_calendar_event_booking_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.booking_status in ('pending_payment', 'confirmed', 'corporate', 'checked_in')
    and exists (
      select 1
      from public.calendar_events event
      where event.property_id = new.property_id
        and event.status = 'active'
        and event.is_blocking = true
        and event.start_date < new.checkout
        and event.end_date > new.check_in
    ) then
    raise exception using
      errcode = '23P01',
      message = 'Those dates are blocked by an external calendar.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_calendar_event_booking_overlap on public.bookings;
create trigger prevent_calendar_event_booking_overlap
before insert or update of property_id, check_in, checkout, booking_status on public.bookings
for each row execute function public.prevent_calendar_event_booking_overlap();
