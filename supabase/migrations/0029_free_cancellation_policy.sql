-- Keep the displayed free-cancellation period in the database, and snapshot
-- the deadline when each reservation is created.
alter table public.properties
  add column if not exists free_cancellation_days integer not null default 7;

alter table public.properties
  drop constraint if exists properties_free_cancellation_days_range;
alter table public.properties
  add constraint properties_free_cancellation_days_range check (free_cancellation_days between 1 and 365);

update public.properties set free_cancellation_days = 7;

alter table public.bookings
  add column if not exists free_cancellation_until date;

update public.bookings b
set free_cancellation_until = b.check_in - p.free_cancellation_days
from public.properties p
where p.id = b.property_id and b.free_cancellation_until is null;

create or replace function public.set_booking_free_cancellation_deadline()
returns trigger language plpgsql as $$
declare policy_days integer;
begin
  select p.free_cancellation_days into policy_days
  from public.properties p where p.id = new.property_id;
  new.free_cancellation_until := new.check_in - coalesce(policy_days, 7);
  return new;
end;
$$;

drop trigger if exists bookings_free_cancellation_deadline on public.bookings;
create trigger bookings_free_cancellation_deadline
  before insert on public.bookings
  for each row execute function public.set_booking_free_cancellation_deadline();

-- Retain historical accounting fields, but remove old promotional wording.
update public.properties
set corporate_instructions = replace(corporate_instructions, 'GST invoices, and ', '')
where corporate_instructions like '%GST invoices, and %';

update public.site_settings
set value = value
  || case when value->>'corporateWorkPoint4' = 'GST invoices and purchase order details on request'
    then jsonb_build_object('corporateWorkPoint4', 'Purchase order details on request') else '{}'::jsonb end
  || case when value->>'corporateFeature6Lead' = 'GST tax invoices and purchase order details can be requested.'
    then jsonb_build_object('corporateFeature6Lead', 'Purchase order details can be included in a company booking.') else '{}'::jsonb end
  || case when value->>'corporateFaq7Question' = 'Can our company request GST tax invoices and ABN billing?'
    then jsonb_build_object('corporateFaq7Question', 'Can our company use a purchase order?') else '{}'::jsonb end
  || case when value->>'corporateFaq7Answer' = 'Yes. We can provide tax invoices with ABN details and support purchase order processing for company bookings.'
    then jsonb_build_object('corporateFaq7Answer', 'Yes. Share your purchase order details with us when arranging a company booking.') else '{}'::jsonb end
where key = 'public_page_copy';

update public.homepage_content
set content = replace(content::text, 'Transparent pricing, GST invoices and a direct contact for extensions or changes.', 'Transparent pricing and a direct contact for extensions or changes.')::jsonb
where page_key = 'home'
  and content::text like '%GST invoices%';
