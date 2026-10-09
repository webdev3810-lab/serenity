-- A private, idempotent audit trail for verified Stripe webhook deliveries.
create table if not exists public.stripe_payment_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processing_status text not null default 'processing'
    check (processing_status in ('processing', 'processed', 'failed', 'ignored')),
  booking_id uuid references public.bookings(id) on delete set null,
  booking_reference text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_cents bigint,
  currency text,
  outcome text not null default 'pending'
    check (outcome in ('pending', 'succeeded', 'declined', 'expired', 'refunded', 'partially_refunded', 'informational')),
  failure_code text,
  failure_message text,
  last_error text,
  livemode boolean not null,
  event_created_at timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_payment_events_recent_idx
  on public.stripe_payment_events (event_created_at desc, id desc);
create index if not exists stripe_payment_events_booking_idx
  on public.stripe_payment_events (booking_id, event_created_at desc);
create index if not exists stripe_payment_events_status_idx
  on public.stripe_payment_events (processing_status, event_created_at desc);

alter table public.stripe_payment_events enable row level security;
create policy "Admins can inspect Stripe payment events" on public.stripe_payment_events
  for select using (public.is_admin());

-- Claim an event once. A failed delivery (or abandoned claim) may be retried.
-- Only server-side service_role can execute this function.
create or replace function public.claim_stripe_payment_event(
  p_stripe_event_id text,
  p_event_type text,
  p_booking_id uuid,
  p_booking_reference text,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_amount_cents bigint,
  p_currency text,
  p_outcome text,
  p_failure_code text,
  p_failure_message text,
  p_livemode boolean,
  p_event_created_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
begin
  insert into public.stripe_payment_events (
    stripe_event_id, event_type, booking_id, booking_reference,
    stripe_checkout_session_id, stripe_payment_intent_id, amount_cents,
    currency, outcome, failure_code, failure_message, livemode,
    event_created_at
  ) values (
    p_stripe_event_id, p_event_type, p_booking_id, p_booking_reference,
    p_stripe_checkout_session_id, p_stripe_payment_intent_id, p_amount_cents,
    p_currency, p_outcome, p_failure_code, p_failure_message, p_livemode,
    p_event_created_at
  )
  on conflict (stripe_event_id) do update
    set processing_status = 'processing',
        attempts = public.stripe_payment_events.attempts + 1,
        last_error = null,
        updated_at = now()
    where public.stripe_payment_events.processing_status = 'failed'
       or (public.stripe_payment_events.processing_status = 'processing'
           and public.stripe_payment_events.updated_at < now() - interval '5 minutes')
  returning id into claimed_id;

  return claimed_id is not null;
end;
$$;

revoke all on function public.claim_stripe_payment_event(text, text, uuid, text, text, text, bigint, text, text, text, text, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_stripe_payment_event(text, text, uuid, text, text, text, bigint, text, text, text, text, boolean, timestamptz) to service_role;
