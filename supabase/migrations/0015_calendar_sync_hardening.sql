-- Harden and extend the existing calendar and dated-pricing systems without
-- replacing any booking, calendar, or pricing records.

alter table public.calendar_connections
  add column if not exists last_attempt_at timestamptz,
  add column if not exists sync_frequency_minutes integer not null default 15,
  add column if not exists last_imported_event_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'calendar_connections_sync_frequency_check'
  ) then
    alter table public.calendar_connections
      add constraint calendar_connections_sync_frequency_check
      check (sync_frequency_minutes between 5 and 1440);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'calendar_connections_imported_count_check'
  ) then
    alter table public.calendar_connections
      add constraint calendar_connections_imported_count_check
      check (last_imported_event_count >= 0);
  end if;
end $$;

alter table public.calendar_events
  add column if not exists block_reason text,
  add column if not exists internal_note text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'calendar_events_block_reason_check'
  ) then
    alter table public.calendar_events
      add constraint calendar_events_block_reason_check
      check (
        block_reason is null or block_reason in (
          'maintenance', 'owner_use', 'cleaning', 'preparation',
          'renovation', 'private_booking', 'other'
        )
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'calendar_events_internal_note_length_check'
  ) then
    alter table public.calendar_events
      add constraint calendar_events_internal_note_length_check
      check (char_length(internal_note) <= 1000);
  end if;
end $$;

alter table public.property_date_prices
  add column if not exists is_active boolean not null default true;

create index if not exists property_date_prices_active_lookup_idx
  on public.property_date_prices (property_id, price_date)
  where is_active = true;

