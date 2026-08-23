-- Unified Serenity reservations: structured provenance, idempotent corporate
-- conversion, and race-safe booking/calendar overlap protection.

alter table public.bookings
  add column if not exists booking_type text not null default 'standard',
  add column if not exists booking_source text not null default 'website',
  add column if not exists enquiry_id uuid references public.enquiries(id) on delete set null,
  add column if not exists group_reference text,
  add column if not exists idempotency_key text,
  add column if not exists internal_notes text not null default '',
  add column if not exists created_by_admin uuid references auth.users(id) on delete set null;

update public.bookings
set
  booking_type = case
    when booking_status = 'corporate' or lower(coalesce(corporate_details ->> 'corporate', 'false')) = 'true' then 'corporate'
    else 'standard'
  end,
  booking_source = case
    when corporate_details ? 'enquiryId' then 'enquiry'
    when booking_status = 'corporate' or lower(coalesce(corporate_details ->> 'corporate', 'false')) = 'true' then 'corporate_page'
    else 'website'
  end,
  enquiry_id = case
    when corporate_details ->> 'enquiryId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then (corporate_details ->> 'enquiryId')::uuid
    else enquiry_id
  end,
  group_reference = coalesce(group_reference, nullif(corporate_details ->> 'groupReference', ''));

alter table public.bookings drop constraint if exists bookings_booking_type_check;
alter table public.bookings add constraint bookings_booking_type_check
  check (booking_type in ('standard', 'corporate', 'admin'));

alter table public.bookings drop constraint if exists bookings_booking_source_check;
alter table public.bookings add constraint bookings_booking_source_check
  check (booking_source in ('website', 'corporate_page', 'admin', 'enquiry', 'airbnb', 'vrbo', 'stayz'));

create index if not exists bookings_type_source_idx
  on public.bookings (booking_type, booking_source, created_at desc);
create index if not exists bookings_enquiry_idx
  on public.bookings (enquiry_id) where enquiry_id is not null;
create index if not exists bookings_group_reference_idx
  on public.bookings (group_reference) where group_reference is not null;
create unique index if not exists bookings_idempotency_property_uidx
  on public.bookings (idempotency_key, property_id) where idempotency_key is not null;

alter table public.enquiries
  add column if not exists reference text,
  add column if not exists source text not null default 'corporate_page',
  add column if not exists idempotency_key text,
  add column if not exists converted_at timestamptz,
  add column if not exists conversion_group_reference text;

update public.enquiries
set reference = coalesce(reference, 'ENQ-' || upper(substr(replace(id::text, '-', ''), 1, 10)));

alter table public.enquiries alter column reference set not null;
alter table public.enquiries alter column reference set default ('ENQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));
alter table public.enquiries drop constraint if exists enquiries_status_check;
alter table public.enquiries add constraint enquiries_status_check
  check (status in ('new', 'contacted', 'pending_approval', 'approved', 'declined', 'converted'));
alter table public.enquiries drop constraint if exists enquiries_source_check;
alter table public.enquiries add constraint enquiries_source_check
  check (source in ('corporate_page', 'admin'));

create unique index if not exists enquiries_reference_uidx on public.enquiries (reference);
create unique index if not exists enquiries_idempotency_uidx
  on public.enquiries (idempotency_key) where idempotency_key is not null;

create or replace function public.prevent_calendar_event_booking_overlap()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.booking_status in ('pending_payment', 'confirmed', 'corporate', 'checked_in') then
    perform pg_advisory_xact_lock(hashtextextended(new.property_id::text, 0));

    if exists (
      select 1
      from public.calendar_events event
      where event.property_id = new.property_id
        and event.status = 'active'
        and event.is_blocking = true
        and daterange(event.start_date, event.end_date, '[)') && daterange(new.check_in, new.checkout, '[)')
    ) then
      raise exception using
        errcode = '23P01',
        message = 'Those dates are blocked by a connected or manual calendar.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_calendar_event_booking_overlap on public.bookings;
create trigger prevent_calendar_event_booking_overlap
before insert or update of property_id, check_in, checkout, booking_status on public.bookings
for each row execute function public.prevent_calendar_event_booking_overlap();

create or replace function public.prevent_booking_calendar_event_overlap()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active' and new.is_blocking = true then
    perform pg_advisory_xact_lock(hashtextextended(new.property_id::text, 0));

    if exists (
      select 1
      from public.bookings booking
      where booking.property_id = new.property_id
        and booking.booking_status in ('pending_payment', 'confirmed', 'corporate', 'checked_in')
        and daterange(booking.check_in, booking.checkout, '[)') && daterange(new.start_date, new.end_date, '[)')
    ) then
      raise exception using
        errcode = '23P01',
        message = 'Those dates overlap an active Serenity booking.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_booking_calendar_event_overlap on public.calendar_events;
create trigger prevent_booking_calendar_event_overlap
before insert or update of property_id, start_date, end_date, status, is_blocking on public.calendar_events
for each row execute function public.prevent_booking_calendar_event_overlap();

create or replace function public.create_booking_group(
  p_rows jsonb,
  p_group_reference text default null,
  p_enquiry_id uuid default null,
  p_idempotency_key text default null
)
returns setof public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  locked_property uuid;
  enquiry_row public.enquiries%rowtype;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 3 then
    raise exception 'A booking group must contain between one and three houses.' using errcode = '22023';
  end if;

  if p_enquiry_id is not null then
    select * into enquiry_row from public.enquiries where id = p_enquiry_id for update;
    if not found then
      raise exception 'Corporate enquiry not found.' using errcode = 'P0002';
    end if;
    if enquiry_row.converted_at is not null then
      return query select booking.* from public.bookings booking where booking.enquiry_id = p_enquiry_id order by booking.created_at;
      return;
    end if;
    if enquiry_row.status <> 'approved' then
      raise exception 'Approve the enquiry before converting it.' using errcode = '22023';
    end if;
  end if;

  if nullif(trim(p_idempotency_key), '') is not null and exists (
    select 1 from public.bookings booking where booking.idempotency_key = trim(p_idempotency_key)
  ) then
    return query
      select booking.* from public.bookings booking
      where booking.idempotency_key = trim(p_idempotency_key)
      order by booking.created_at;
    return;
  end if;

  for locked_property in
    select distinct (item ->> 'property_id')::uuid
    from jsonb_array_elements(p_rows) item
    order by 1
  loop
    perform pg_advisory_xact_lock(hashtextextended(locked_property::text, 0));
  end loop;

  return query
  insert into public.bookings (
    reference, property_id, check_in, checkout, adults, children, infants, pets,
    guest_details, corporate_details, price_breakdown, total, currency,
    payment_status, booking_status, notes, booking_type, booking_source,
    enquiry_id, group_reference, idempotency_key, internal_notes, created_by_admin
  )
  select
    item ->> 'reference',
    (item ->> 'property_id')::uuid,
    (item ->> 'check_in')::date,
    (item ->> 'checkout')::date,
    coalesce((item ->> 'adults')::integer, 1),
    coalesce((item ->> 'children')::integer, 0),
    coalesce((item ->> 'infants')::integer, 0),
    coalesce((item ->> 'pets')::integer, 0),
    coalesce(item -> 'guest_details', '{}'::jsonb),
    coalesce(item -> 'corporate_details', '{}'::jsonb),
    coalesce(item -> 'price_breakdown', '{}'::jsonb),
    coalesce((item ->> 'total')::numeric, 0),
    coalesce(nullif(item ->> 'currency', ''), 'AUD'),
    coalesce(nullif(item ->> 'payment_status', ''), 'pending'),
    coalesce(nullif(item ->> 'booking_status', ''), 'confirmed'),
    coalesce(item ->> 'notes', ''),
    coalesce(nullif(item ->> 'booking_type', ''), 'standard'),
    coalesce(nullif(item ->> 'booking_source', ''), 'website'),
    coalesce(p_enquiry_id, nullif(item ->> 'enquiry_id', '')::uuid),
    coalesce(nullif(trim(p_group_reference), ''), nullif(item ->> 'group_reference', '')),
    coalesce(nullif(trim(p_idempotency_key), ''), nullif(item ->> 'idempotency_key', '')),
    coalesce(item ->> 'internal_notes', ''),
    nullif(item ->> 'created_by_admin', '')::uuid
  from jsonb_array_elements(p_rows) item
  returning public.bookings.*;

  if p_enquiry_id is not null then
    update public.enquiries
    set
      status = 'converted',
      converted_at = timezone('utc', now()),
      conversion_group_reference = p_group_reference
    where id = p_enquiry_id;
  end if;
end;
$$;

revoke all on function public.create_booking_group(jsonb, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_booking_group(jsonb, text, uuid, text) to service_role;
