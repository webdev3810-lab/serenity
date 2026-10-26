-- Keep booking and payment history while removing completed records from the
-- default admin reservation sheet. Archiving does not change availability.
alter table public.bookings
  add column if not exists archived_at timestamptz;

create index if not exists bookings_archived_at_idx
  on public.bookings (archived_at)
  where archived_at is not null;
