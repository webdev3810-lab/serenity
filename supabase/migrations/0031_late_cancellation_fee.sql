-- Snapshot the advertised late-cancellation fee when a new reservation is made.
-- Existing reservations retain their original terms (NULL means manual review).
alter table public.properties
  add column if not exists late_cancellation_fee numeric(12,2) not null default 25;

alter table public.properties
  drop constraint if exists properties_late_cancellation_fee_range;
alter table public.properties
  add constraint properties_late_cancellation_fee_range
  check (late_cancellation_fee >= 0 and late_cancellation_fee <= 100000);

alter table public.bookings
  add column if not exists late_cancellation_fee numeric(12,2),
  add column if not exists cancellation_fee_retained numeric(12,2),
  add column if not exists stripe_refund_id text,
  add column if not exists refund_amount numeric(12,2),
  add column if not exists refund_status text;

alter table public.bookings
  drop constraint if exists bookings_late_cancellation_fee_range;
alter table public.bookings
  add constraint bookings_late_cancellation_fee_range
  check (late_cancellation_fee is null or (late_cancellation_fee >= 0 and late_cancellation_fee <= 100000));

alter table public.bookings
  drop constraint if exists bookings_refund_status_check;
alter table public.bookings
  add constraint bookings_refund_status_check
  check (refund_status is null or refund_status in ('pending', 'requires_action', 'succeeded', 'failed', 'canceled'));

alter table public.bookings
  drop constraint if exists bookings_payment_status_check;
alter table public.bookings
  add constraint bookings_payment_status_check
  check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'partially_refunded'));

create or replace function public.set_booking_free_cancellation_deadline()
returns trigger language plpgsql as $$
declare
  policy_days integer;
  policy_fee numeric(12,2);
begin
  select p.free_cancellation_days, p.late_cancellation_fee
    into policy_days, policy_fee
  from public.properties p where p.id = new.property_id;
  new.free_cancellation_until := new.check_in - coalesce(policy_days, 7);
  new.late_cancellation_fee := coalesce(policy_fee, 25);
  return new;
end;
$$;
