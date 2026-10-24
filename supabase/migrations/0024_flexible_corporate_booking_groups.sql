-- Allow one or more houses in one corporate payment, including houses added later.
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
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 then
    raise exception 'A booking group must contain at least one house.' using errcode = '22023';
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
