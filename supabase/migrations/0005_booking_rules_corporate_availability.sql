-- Configurable, auditable booking rules for each published house.
alter table public.properties
  add column if not exists maximum_stay integer not null default 90,
  add column if not exists minimum_guests integer not null default 1,
  add column if not exists maximum_adults integer not null default 12,
  add column if not exists maximum_children integer not null default 12,
  add column if not exists maximum_infants integer not null default 2,
  add column if not exists maximum_pets integer not null default 2,
  add column if not exists minimum_advance_notice_days integer not null default 0,
  add column if not exists maximum_advance_booking_days integer not null default 365,
  add column if not exists same_day_booking_allowed boolean not null default true,
  add column if not exists weekend_booking_allowed boolean not null default true,
  add column if not exists instant_booking_enabled boolean not null default true,
  add column if not exists booking_request_required boolean not null default false,
  add column if not exists pets_allowed boolean not null default true,
  add column if not exists corporate_booking_allowed boolean not null default true,
  add column if not exists minimum_corporate_stay integer not null default 7,
  add column if not exists minimum_corporate_houses integer not null default 1,
  add column if not exists maximum_corporate_houses integer not null default 3,
  add column if not exists adjacent_houses_allowed boolean not null default true,
  add column if not exists long_term_stays_allowed boolean not null default true,
  add column if not exists corporate_discount numeric(5,2) not null default 0,
  add column if not exists corporate_approval_required boolean not null default false,
  add column if not exists corporate_deposit_required boolean not null default false,
  add column if not exists corporate_online_payment boolean not null default true,
  add column if not exists gst_invoice_available boolean not null default true,
  add column if not exists corporate_instructions text not null default 'Corporate stays are welcome. Contact Serenity for multi-house availability, GST invoices, and project-team arrangements.';

update public.properties
set maximum_adults = least(maximum_adults, max_guests),
    maximum_children = least(maximum_children, max_guests),
    minimum_guests = least(minimum_guests, max_guests),
    minimum_corporate_stay = greatest(minimum_corporate_stay, minimum_stay)
where true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_stay_range_check') then
    alter table public.properties add constraint properties_stay_range_check check (maximum_stay >= minimum_stay);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_guest_rules_check') then
    alter table public.properties add constraint properties_guest_rules_check check (
      minimum_guests between 1 and max_guests
      and maximum_adults between 1 and max_guests
      and maximum_children between 0 and max_guests
      and maximum_infants >= 0
      and maximum_pets >= 0
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_advance_notice_check') then
    alter table public.properties add constraint properties_advance_notice_check check (minimum_advance_notice_days >= 0 and maximum_advance_booking_days >= minimum_advance_notice_days);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_corporate_rules_check') then
    alter table public.properties add constraint properties_corporate_rules_check check (
      minimum_corporate_stay >= minimum_stay
      and minimum_corporate_houses between 1 and maximum_corporate_houses
      and maximum_corporate_houses between 1 and 3
      and corporate_discount between 0 and 100
      and char_length(corporate_instructions) <= 1000
    );
  end if;
end $$;

alter table public.enquiries
  add column if not exists property_ids uuid[] not null default '{}',
  add column if not exists abn text not null default '',
  add column if not exists purchase_order text not null default '',
  add column if not exists invoice_requested boolean not null default false,
  add column if not exists internal_notes text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'enquiries_business_fields_length_check') then
    alter table public.enquiries add constraint enquiries_business_fields_length_check check (
      char_length(abn) <= 30 and char_length(purchase_order) <= 120 and char_length(internal_notes) <= 1000
    );
  end if;
end $$;

create index if not exists bookings_availability_lookup_idx on public.bookings (property_id, check_in, checkout)
  where booking_status in ('pending_payment', 'confirmed', 'corporate', 'checked_in');
create index if not exists enquiries_status_created_idx on public.enquiries (status, created_at desc);
create index if not exists enquiries_property_ids_idx on public.enquiries using gin (property_ids);
