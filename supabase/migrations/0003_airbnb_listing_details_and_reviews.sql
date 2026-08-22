/*
  Serenity listing details and verified Airbnb reviews

  This migration deliberately does not write to public.property_images or to
  storage.objects. Existing property photos, URLs, storage paths, alt text,
  and display order are therefore preserved exactly as they are.

  Source pages were inspected on 14 August 2026. Airbnb only exposed
  month/year review dates, so review_date remains NULL and the exact visible
  label is stored in review_date_label rather than inventing a day.
*/

begin;

/* Keep a temporary before-image snapshot so the verification query at the end
   can prove that this migration did not change existing photo records. */
create temporary table serenity_property_images_before as
select
  p.slug,
  pi.id,
  pi.property_id,
  pi.storage_path,
  pi.external_url,
  pi.alt_text,
  pi.display_order
from public.properties p
join public.property_images pi on pi.property_id = p.id
where p.slug in ('serenity-7', 'serenity-9', 'serenity-11');

/* Flexible listing fields keep the existing relational schema stable while
   retaining source wording, amenities, safety, access, host, and area data. */
alter table public.properties
  add column if not exists listing_details jsonb not null default '{}'::jsonb;

/* Reviews are intentionally limited to five stars. No reviewer image or
   private reviewer information is stored. */
create table if not exists public.property_reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  reviewer_name text not null,
  review_text text not null default '',
  rating integer not null default 5,
  review_date date,
  review_date_label text,
  source text not null default 'Airbnb',
  source_review_id text not null,
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.property_reviews
  add column if not exists reviewer_name text,
  add column if not exists review_text text,
  add column if not exists rating integer,
  add column if not exists review_date date,
  add column if not exists review_date_label text,
  add column if not exists source text,
  add column if not exists source_review_id text,
  add column if not exists display_order integer,
  add column if not exists published boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.property_reviews
  alter column rating set default 5,
  alter column source set default 'Airbnb',
  alter column display_order set default 0,
  alter column published set default true,
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

create unique index if not exists property_reviews_source_review_id_uidx
  on public.property_reviews (source, source_review_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.property_reviews'::regclass
      and conname = 'property_reviews_only_five_stars'
  ) then
    alter table public.property_reviews
      add constraint property_reviews_only_five_stars check (rating between 5 and 5) not valid;
  end if;
end;
$$;

drop trigger if exists property_reviews_updated_at on public.property_reviews;
create trigger property_reviews_updated_at
before update on public.property_reviews
for each row execute function public.set_updated_at();

alter table public.property_reviews enable row level security;

drop policy if exists "Published property reviews are public" on public.property_reviews;
create policy "Published property reviews are public"
on public.property_reviews for select
using (
  published = true
  and exists (
    select 1 from public.properties p
    where p.id = property_id and p.published = true
  )
);

drop policy if exists "Admins manage property reviews" on public.property_reviews;
create policy "Admins manage property reviews"
on public.property_reviews for all
using (public.is_admin())
with check (public.is_admin());

/*
  Verified listing information. Pricing, unavailable dates, published state,
  featured state, and display order are intentionally omitted from the
  conflict updates so existing booking and publishing settings remain intact.
*/

insert into public.properties (
  id, name, slug, property_type, location, short_description, full_description,
  max_guests, bedrooms, beds, bathrooms, bed_arrangements, check_in_time,
  checkout_time, pet_policy, parking_type, nightly_price, cleaning_fee, pet_fee,
  extra_guest_fee, extra_guest_threshold, minimum_stay, weekly_discount,
  monthly_discount, house_rules, nearby_locations, unavailable_dates,
  latitude, longitude, published, featured, display_order, listing_details
)
values (
  '00000000-0000-0000-0000-000000000007',
  'Serenity 7 - Whole',
  'serenity-7',
  'Entire home',
  'Pakenham, Victoria, Australia',
  'Corporate and company bookings are accepted. Brand NEW HOUSE at the heart of Pakenham, a short 5-minute walk to Pakenham train station and few steps away from Bus station.',
  'Corporate and company bookings are accepted. Brand NEW HOUSE at the heart of Pakenham, a short 5-minute walk to Pakenham train station and few steps away from Bus station. Family oriented area close to major Shopping Centre, Restaurants and across Pakenham Industrial Park. An ideal place to relax and explore Gumbuya World, Gippsland Region & Philip Island. Fully furnished for your comfortable stay with NBN internet. Quiet yet friendly neighborhood.',
  6, 3, 5, 2.5,
  '[{"room":"Bedroom 1","beds":"1 queen bed"},{"room":"Bedroom 2","beds":"2 single beds"},{"room":"Bedroom 3","beds":"2 single beds"}]'::jsonb,
  '3:00 PM', '11:00 AM', 'Pets allowed. Furry friends welcome.', 'Free parking on premises',
  240, 120, 45, 20, 4, 2, 8, 15,
  array['Check-in after 3:00 PM','Checkout before 11:00 AM','Maximum guest limit applies','Pets must be declared','No parties or events','No smoking inside','Quiet hours from 10:00 PM to 7:00 AM'],
  array['Beside Serenity 9 and Serenity 11','Pakenham town centre','Pakenham train station','Deep Creek Eco Playspace'],
  array['2026-08-12','2026-08-13','2026-08-14','2026-09-02','2026-09-03','2026-10-18','2026-10-19']::date[],
  -38.0702, 145.4742, true, true, 1,
  $listing7$
  {
    "source": "Airbnb",
    "source_listing_id": "816807273649311812",
    "source_listing_url": "https://www.airbnb.com.au/rooms/816807273649311812",
    "listing_title": "Serenity 7 - Whole",
    "property_type": "Entire home in Pakenham, Australia",
    "listing_highlights": {
      "self_check_in": "Check yourself in with the key safe.",
      "pet_policy": "Bring your pets along for the stay."
    },
    "description_sections": {
      "main": "Corporate and company bookings are accepted. Brand NEW HOUSE at the heart of Pakenham, a short 5-minute walk to Pakenham train station and few steps away from Bus station. Family oriented area close to major Shopping Centre, Restaurants and across Pakenham Industrial Park. An ideal place to relax and explore Gumbuya World, Gippsland Region & Philip Island. Fully furnished for your comfortable stay with NBN internet. Quiet yet friendly neighborhood."
    },
    "guest_access": null,
    "host_interaction": {
      "host_name": "Francis",
      "hosting_duration": "8 years hosting",
      "response_rate": "100%",
      "response_time": "Responds within an hour",
      "residence": "Melbourne, Australia"
    },
    "amenities": ["Bathtub","Cleaning products","Hot water","Washing machine","Towels, bed sheets, soap and toilet paper","Hangers","Iron","HDTV with Netflix","Air conditioning","Heating","Smoke alarm","Carbon monoxide alarm","Fire extinguisher","First aid kit","Wifi","Kitchen","Refrigerator","Microwave","Pots and pans, oil, salt and pepper","Bowls, chopsticks, plates, cups, etc.","Freezer","Dishwasher","Stove","Oven","Hot water kettle","Toaster","Dining table","Private backyard","Free parking on premises","Pets allowed","Assistance animals are always allowed","Long-term stays allowed","Self check-in","Key Safe"],
    "not_included": ["Exterior security cameras on property","Dryer"],
    "laundry": ["Washing machine","Dryer unavailable"],
    "internet_and_workspace": ["NBN internet","Wifi"],
    "heating_and_air_conditioning": ["Air conditioning","Heating"],
    "parking": ["Free parking on premises"],
    "safety_information": ["Smoke alarm","Carbon monoxide alarm","Fire extinguisher","First aid kit"],
    "airbnb_house_rules": ["Check-in after 3:00 pm","Checkout before 11:00 am","6 guests maximum"],
    "cancellation_policy": "Add your trip dates to get the cancellation details for this stay.",
    "neighbourhood_information": "Quiet yet friendly neighborhood.",
    "nearby_places": ["Pakenham train station","Bus station","Major Shopping Centre","Restaurants","Pakenham Industrial Park","Gumbuya World","Gippsland Region","Philip Island"],
    "review_summary": {"rating": 3.75, "review_count": 4, "five_star_count": 1}
  }
  $listing7$::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  property_type = excluded.property_type,
  location = excluded.location,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  max_guests = excluded.max_guests,
  bedrooms = excluded.bedrooms,
  beds = excluded.beds,
  bathrooms = excluded.bathrooms,
  bed_arrangements = excluded.bed_arrangements,
  check_in_time = excluded.check_in_time,
  checkout_time = excluded.checkout_time,
  pet_policy = excluded.pet_policy,
  parking_type = excluded.parking_type,
  listing_details = excluded.listing_details,
  updated_at = timezone('utc', now());

insert into public.properties (
  id, name, slug, property_type, location, short_description, full_description,
  max_guests, bedrooms, beds, bathrooms, bed_arrangements, check_in_time,
  checkout_time, pet_policy, parking_type, nightly_price, cleaning_fee, pet_fee,
  extra_guest_fee, extra_guest_threshold, minimum_stay, weekly_discount,
  monthly_discount, house_rules, nearby_locations, unavailable_dates,
  latitude, longitude, published, featured, display_order, listing_details
)
values (
  '00000000-0000-0000-0000-000000000009',
  'Serenity 9 - Whole',
  'serenity-9',
  'Entire home',
  'Pakenham, Victoria, Australia',
  'LIVE WORK PLAY - Corporate and company bookings are accepted. Brand New House at the heart of Pakenham, a short 5-minute walk to Pakenham train station & few steps away from Bus Station.',
  'LIVE WORK PLAY - Corporate and company bookings are accepted. Brand New House at the heart of Pakenham, a short 5-minute walk to Pakenham train station & few steps away from Bus Station. Family oriented area close to major Shopping Centre, Restaurants & across Pakenham Industrial Park. An ideal place to relax and explore Gumbaya World, Gippsland Region & Phillip Island. It is fully furnished for your comfortable stay with NBN internet. It is fully furnished for a comfortable stay with NBN internet WIFI and NETFLIX.',
  8, 4, 6, 2.5,
  '[{"room":"Bedroom 1","beds":"1 queen bed"},{"room":"Bedroom 2","beds":"2 single beds"},{"room":"Bedroom 3","beds":"2 single beds"},{"room":"Bedroom 4","beds":"1 single bed"}]'::jsonb,
  '3:00 PM', '11:00 AM', 'Pets allowed. Furry friends welcome.', 'Free parking on premises; Free street parking',
  290, 145, 45, 20, 6, 2, 10, 18,
  array['Check-in after 3:00 PM','Checkout before 11:00 AM','Maximum guest limit applies','Pets must be declared','No parties or events','No smoking inside','Quiet hours from 10:00 PM to 7:00 AM'],
  array['Beside Serenity 7 and Serenity 11','Pakenham town centre','Pakenham train station','Pakenham services'],
  array['2026-08-20','2026-08-21','2026-09-10','2026-09-11','2026-09-12','2026-10-03','2026-10-04']::date[],
  -38.0718, 145.4802, true, true, 2,
  $listing9$
  {
    "source": "Airbnb",
    "source_listing_id": "30776642",
    "source_listing_url": "https://www.airbnb.com.au/rooms/30776642",
    "listing_title": "Serenity 9 - Whole",
    "property_type": "Entire home in Pakenham, Australia",
    "listing_highlights": {
      "self_check_in": "Check yourself in with the key safe.",
      "pet_policy": "Bring your pets along for the stay.",
      "parking_highlight": "This is one of the few places in the area with free parking."
    },
    "description_sections": {
      "main": "LIVE WORK PLAY - Corporate and company bookings are accepted. Brand New House at the heart of Pakenham, a short 5-minute walk to Pakenham train station & few steps away from Bus Station. Family oriented area close to major Shopping Centre, Restaurants & across Pakenham Industrial Park. An ideal place to relax and explore Gumbaya World, Gippsland Region & Phillip Island. It is fully furnished for your comfortable stay with NBN internet.",
      "space": "It is fully furnished for a comfortable stay with NBN internet WIFI and NETFLIX.",
      "guest_access": "All bedrooms are exclusively for guests."
    },
    "host_interaction": {
      "host_name": "Francis",
      "hosting_duration": "8 years hosting",
      "response_rate": "100%",
      "response_time": "Responds within an hour",
      "residence": "Melbourne, Australia"
    },
    "amenities": ["Hot water","Washing machine","Hangers","Bed linen","Black-out blinds","Iron","Drying rack for clothing","Clothing storage","TV","Air conditioning","Heating","Smoke alarm","Carbon monoxide alarm","Fire extinguisher","Wifi","Kitchen","Refrigerator","Microwave","Pots and pans, oil, salt and pepper","Bowls, chopsticks, plates, cups, etc.","Dishwasher","Stove","Oven","Backyard","Free parking on premises","Free street parking","Pets allowed","Assistance animals are always allowed","Self check-in","Key Safe"],
    "not_included": ["Dryer","Essentials"],
    "laundry": ["Washing machine","Dryer unavailable"],
    "internet_and_workspace": ["NBN internet","Wifi","Ethernet connection"],
    "heating_and_air_conditioning": ["Air conditioning","Heating"],
    "parking": ["Free parking on premises","Free street parking"],
    "safety_information": ["Smoke alarm","Carbon monoxide alarm","Fire extinguisher"],
    "airbnb_house_rules": ["Check-in after 3:00 pm","Checkout before 11:00 am","8 guests maximum"],
    "cancellation_policy": "Add your trip dates to get the cancellation details for this stay.",
    "neighbourhood_information": "Minute walk to Pakenham town center and train stations. close to major shopping centre, restaurants, bus station and across Pakenham Industrial Park.",
    "nearby_places": ["Pakenham town center","Train stations","Major shopping centre","Restaurants","Bus station","Pakenham Industrial Park","Gumbaya World","Gippsland Region","Phillip Island"],
    "review_summary": {"rating": 4.71, "review_count": 21, "five_star_count": 16}
  }
  $listing9$::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  property_type = excluded.property_type,
  location = excluded.location,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  max_guests = excluded.max_guests,
  bedrooms = excluded.bedrooms,
  beds = excluded.beds,
  bathrooms = excluded.bathrooms,
  bed_arrangements = excluded.bed_arrangements,
  check_in_time = excluded.check_in_time,
  checkout_time = excluded.checkout_time,
  pet_policy = excluded.pet_policy,
  parking_type = excluded.parking_type,
  listing_details = excluded.listing_details,
  updated_at = timezone('utc', now());

insert into public.properties (
  id, name, slug, property_type, location, short_description, full_description,
  max_guests, bedrooms, beds, bathrooms, bed_arrangements, check_in_time,
  checkout_time, pet_policy, parking_type, nightly_price, cleaning_fee, pet_fee,
  extra_guest_fee, extra_guest_threshold, minimum_stay, weekly_discount,
  monthly_discount, house_rules, nearby_locations, unavailable_dates,
  latitude, longitude, published, featured, display_order, listing_details
)
values (
  '00000000-0000-0000-0000-000000000011',
  'Serenity 11 - Whole',
  'serenity-11',
  'Entire home',
  'Pakenham, Victoria, Australia',
  'LIVE WORK PLAY - Corporate and company bookings are accepted. Brand New House at the heart of Pakenham, a short 5-minute walk to Pakenham train station & few steps away from Bus Station.',
  'LIVE WORK PLAY - Corporate and company bookings are accepted. Brand New House at the heart of Pakenham, a short 5-minute walk to Pakenham train station & few steps away from Bus Station. Family oriented area close to major Shopping Centre, Restaurants & across Pakenham Industrial Park. It is fully furnished for your comfortable stay with NBN internet. It is fully furnished for a comfortable stay with NBN internet WIFI and NETFLIX.',
  7, 4, 5, 2.5,
  '[{"room":"Bedroom 1","beds":"2 single beds"},{"room":"Bedroom 2","beds":"1 queen bed"},{"room":"Bedroom 3","beds":"1 queen bed"},{"room":"Bedroom 4","beds":"1 single bed"}]'::jsonb,
  '3:00 PM', '11:00 AM', 'Pets allowed. Furry friends welcome.', 'Free street parking',
  270, 135, 45, 20, 5, 2, 8, 16,
  array['Check-in after 3:00 PM','Checkout before 11:00 AM','Maximum guest limit applies','Pets must be declared','No parties or events','No smoking inside','Quiet hours from 10:00 PM to 7:00 AM'],
  array['Beside Serenity 7 and Serenity 9','Deep Creek Eco Playspace','Pakenham train station','Pakenham South','Cardinia region'],
  array['2026-08-28','2026-08-29','2026-09-18','2026-09-19','2026-10-09','2026-10-10','2026-10-11']::date[],
  -38.0665, 145.486, true, true, 3,
  $listing11$
  {
    "source": "Airbnb",
    "source_listing_id": "38935171",
    "source_listing_url": "https://www.airbnb.com.au/rooms/38935171",
    "listing_title": "Serenity 11 - Whole",
    "property_type": "Entire home in Pakenham, Australia",
    "listing_highlights": {
      "self_check_in": "Check yourself in with the key safe.",
      "pet_policy": "Bring your pets along for the stay."
    },
    "description_sections": {
      "main": "LIVE WORK PLAY - Corporate and company bookings are accepted. Brand New House at the heart of Pakenham, a short 5-minute walk to Pakenham train station & few steps away from Bus Station. Family oriented area close to major Shopping Centre, Restaurants and across Pakenham Industrial Park. It is fully furnished for your comfortable stay with NBN internet.",
      "space": "It is fully furnished for a comfortable stay with NBN internet WIFI and NETFLIX."
    },
    "guest_access": null,
    "host_interaction": {
      "host_name": "Francis",
      "hosting_duration": "8 years hosting",
      "response_rate": "100%",
      "response_time": "Responds within an hour",
      "residence": "Melbourne, Australia"
    },
    "amenities": ["Bathtub","Cleaning products","Hot water","Washing machine","Free dryer – In building","Towels, bed sheets, soap and toilet paper","Hangers","Bed linen","Cotton linen","Black-out blinds","Iron","Drying rack for clothing","Ethernet connection","HDTV with Netflix","Books and reading material","Air conditioning","Heating","Smoke alarm","Carbon monoxide alarm","Fire extinguisher","First aid kit","Wifi","Kitchen","Refrigerator","Microwave","Pots and pans, oil, salt and pepper","Bowls, chopsticks, plates, cups, etc.","Freezer","Dishwasher","Gas stove","Oven","Hot water kettle","Toaster","Dining table","Private entrance","Laundromat nearby","Private backyard – Fully fenced","Free street parking","Single level home","No stairs in home","Pets allowed","Assistance animals are always allowed","Long-term stays allowed","Self check-in","Key Safe"],
    "laundry": ["Washing machine","Free dryer – In building"],
    "internet_and_workspace": ["NBN internet","Wifi","Ethernet connection"],
    "heating_and_air_conditioning": ["Air conditioning","Heating"],
    "parking": ["Free street parking"],
    "safety_information": ["Smoke alarm","Carbon monoxide alarm","Fire extinguisher","First aid kit"],
    "airbnb_house_rules": ["Check-in after 3:00 pm","Checkout before 11:00 am","7 guests maximum"],
    "cancellation_policy": "Add your trip dates to get the cancellation details for this stay.",
    "nearby_places": ["Pakenham train station","Bus station","Major Shopping Centre","Restaurants","Pakenham Industrial Park","Gumbaya World","Gippsland Region","Phillip Island"],
    "review_summary": {"rating": 4.07, "review_count": 14, "five_star_count": 7}
  }
  $listing11$::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  property_type = excluded.property_type,
  location = excluded.location,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  max_guests = excluded.max_guests,
  bedrooms = excluded.bedrooms,
  beds = excluded.beds,
  bathrooms = excluded.bathrooms,
  bed_arrangements = excluded.bed_arrangements,
  check_in_time = excluded.check_in_time,
  checkout_time = excluded.checkout_time,
  pet_policy = excluded.pet_policy,
  parking_type = excluded.parking_type,
  listing_details = excluded.listing_details,
  updated_at = timezone('utc', now());

/* Only add missing Airbnb amenities to the relational list. Existing amenity
   rows are not removed or reordered. The complete source lists remain in
   listing_details. */
with source_amenities (slug, name, display_order) as (
  values
    ('serenity-7','Bathtub',101),('serenity-7','Cleaning products',102),('serenity-7','Hot water',103),('serenity-7','Washing machine',104),('serenity-7','Towels, bed sheets, soap and toilet paper',105),('serenity-7','Hangers',106),('serenity-7','Iron',107),('serenity-7','HDTV with Netflix',108),('serenity-7','Air conditioning',109),('serenity-7','Heating',110),('serenity-7','Smoke alarm',111),('serenity-7','Carbon monoxide alarm',112),('serenity-7','Fire extinguisher',113),('serenity-7','First aid kit',114),('serenity-7','Wifi',115),('serenity-7','Kitchen',116),('serenity-7','Refrigerator',117),('serenity-7','Microwave',118),('serenity-7','Pots and pans, oil, salt and pepper',119),('serenity-7','Bowls, chopsticks, plates, cups, etc.',120),('serenity-7','Freezer',121),('serenity-7','Dishwasher',122),('serenity-7','Stove',123),('serenity-7','Oven',124),('serenity-7','Hot water kettle',125),('serenity-7','Toaster',126),('serenity-7','Dining table',127),('serenity-7','Private backyard',128),('serenity-7','Free parking on premises',129),('serenity-7','Pets allowed',130),('serenity-7','Assistance animals are always allowed',131),('serenity-7','Long-term stays allowed',132),('serenity-7','Self check-in',133),('serenity-7','Key Safe',134),
    ('serenity-9','Hot water',101),('serenity-9','Washing machine',102),('serenity-9','Hangers',103),('serenity-9','Bed linen',104),('serenity-9','Black-out blinds',105),('serenity-9','Iron',106),('serenity-9','Drying rack for clothing',107),('serenity-9','Clothing storage',108),('serenity-9','TV',109),('serenity-9','Air conditioning',110),('serenity-9','Heating',111),('serenity-9','Smoke alarm',112),('serenity-9','Carbon monoxide alarm',113),('serenity-9','Fire extinguisher',114),('serenity-9','Wifi',115),('serenity-9','Kitchen',116),('serenity-9','Refrigerator',117),('serenity-9','Microwave',118),('serenity-9','Pots and pans, oil, salt and pepper',119),('serenity-9','Bowls, chopsticks, plates, cups, etc.',120),('serenity-9','Dishwasher',121),('serenity-9','Stove',122),('serenity-9','Oven',123),('serenity-9','Backyard',124),('serenity-9','Free parking on premises',125),('serenity-9','Free street parking',126),('serenity-9','Pets allowed',127),('serenity-9','Assistance animals are always allowed',128),('serenity-9','Self check-in',129),('serenity-9','Key Safe',130),
    ('serenity-11','Bathtub',101),('serenity-11','Cleaning products',102),('serenity-11','Hot water',103),('serenity-11','Washing machine',104),('serenity-11','Free dryer – In building',105),('serenity-11','Towels, bed sheets, soap and toilet paper',106),('serenity-11','Hangers',107),('serenity-11','Bed linen',108),('serenity-11','Cotton linen',109),('serenity-11','Black-out blinds',110),('serenity-11','Iron',111),('serenity-11','Drying rack for clothing',112),('serenity-11','Ethernet connection',113),('serenity-11','HDTV with Netflix',114),('serenity-11','Books and reading material',115),('serenity-11','Air conditioning',116),('serenity-11','Heating',117),('serenity-11','Smoke alarm',118),('serenity-11','Carbon monoxide alarm',119),('serenity-11','Fire extinguisher',120),('serenity-11','First aid kit',121),('serenity-11','Wifi',122),('serenity-11','Kitchen',123),('serenity-11','Refrigerator',124),('serenity-11','Microwave',125),('serenity-11','Pots and pans, oil, salt and pepper',126),('serenity-11','Bowls, chopsticks, plates, cups, etc.',127),('serenity-11','Freezer',128),('serenity-11','Dishwasher',129),('serenity-11','Gas stove',130),('serenity-11','Oven',131),('serenity-11','Hot water kettle',132),('serenity-11','Toaster',133),('serenity-11','Dining table',134),('serenity-11','Private entrance',135),('serenity-11','Laundromat nearby',136),('serenity-11','Private backyard – Fully fenced',137),('serenity-11','Free street parking',138),('serenity-11','Single level home',139),('serenity-11','No stairs in home',140),('serenity-11','Pets allowed',141),('serenity-11','Assistance animals are always allowed',142),('serenity-11','Long-term stays allowed',143),('serenity-11','Self check-in',144),('serenity-11','Key Safe',145)
)
insert into public.amenities (property_id, name, display_order)
select p.id, sa.name, sa.display_order
from source_amenities sa
join public.properties p on p.slug = sa.slug
where not exists (
  select 1 from public.amenities existing
  where existing.property_id = p.id and existing.name = sa.name
);

/* Import only reviews whose visible Airbnb rating is exactly five stars. The
   hash is deterministic, so this block is safe to run repeatedly. */
with incoming_reviews (slug, reviewer_name, review_text, review_date_label, display_order) as (
  values
    ('serenity-7','Jake','Stay was great','March 2025',1),

    ('serenity-9','Sara','Perfect thank you ☺️','October 2024',1),
    ('serenity-9','Emma','The couch is not the most comfiest but apart from that everything was great. Great communication','June 2021',2),
    ('serenity-9','Amanda','Place was easy to find, comfortable and clean. Francis was great to deal with.','May 2021',3),
    ('serenity-9','Alex','Outstanding hospitality, great communication, and friendly service. Thank-you Francis.','March 2021',4),
    ('serenity-9','Yutian','Nice','January 2021',5),
    ('serenity-9','Tevita','Awesome spot! Very clean! Would definitely stay here again and will definitely recommend this one to friends','January 2021',6),
    ('serenity-9','Davis','very clean, excellent area, lots of space however there is only a couch in living room and not comfortable and the beds were very clean but mattresses felt inexpensive.','March 2020',7),
    ('serenity-9','Christophe',E'Very nice place in Pakenham\nJust 10 minutes walk to the railway station or the supermarket\nVery clean and quiet','November 2019',8),
    ('serenity-9','Joseph',E'Great house for my family and I, would 100% stay here again!\nThanks Francis','October 2019',9),
    ('serenity-9','Former Member','Very nice house and patient host.Excellent stay!','September 2019',10),
    ('serenity-9','Mick','Found both Francis and his house to be awesome!! Definitely stay again','July 2019',11),
    ('serenity-9','Hollie','This was a fantastic stay. Francis is an absolute gentleman and his attention to detail with service was amazing. The house was absolutely as described, both by the listing and by other travelers. It was incredibly convenient to everything we needed and extremely comfortable. Highly recommended!','June 2019',12),
    ('serenity-9','Wenping','It was a really great experience. Francis even prepared nice coffee and tea for all of us. Will definitely choose here again by next chance.','April 2019',13),
    ('serenity-9','Brett','This was a lovely fresh house with easy access. I loved that the keys included the garage opener so we didn’t need to leave the vehicle to access the house in poor weather. The bottles of water in every room, as well as tea, coffee and milk were much appreciated. Light filled rooms and fresh airy bathroom were lovely. Easy to find, and excellent communication with the host. Would definitely stay again, thankyou.','April 2019',14),
    ('serenity-9','Michael','Great host. Great place. Definitely reccomend staying with Francis','April 2019',15),
    ('serenity-9','Michael','Great house, great host, definitely will book with Francis again!','March 2019',16),

    ('serenity-11','Chris',E'Francis is a great host.\nHoping to stay longer.','March 2025',1),
    ('serenity-11','Rebecca','We had a great stay, house is what the photos show and we had no problems. Location was excellent and easy to find.','February 2022',2),
    ('serenity-11','Andrew','Awesome stay 👌','January 2022',3),
    ('serenity-11','吉克','Good host. Will come back again.','December 2021',4),
    ('serenity-11','Shaun','Easy to deal with, good communication. Fast and smooth process','August 2021',5),
    ('serenity-11','Kelly','Great place to have somewhere to sleep and good location for the party we were attending!!','May 2021',6),
    ('serenity-11','Alice','great','March 2021',7)
), prepared as (
  select
    ir.*,
    md5(concat_ws('|', ir.slug, ir.reviewer_name, ir.review_date_label, ir.review_text)) as source_review_id
  from incoming_reviews ir
)
insert into public.property_reviews (
  property_id, reviewer_name, review_text, rating, review_date,
  review_date_label, source, source_review_id, display_order, published
)
select
  p.id, prepared.reviewer_name, prepared.review_text, 5, null,
  prepared.review_date_label, 'Airbnb', prepared.source_review_id,
  prepared.display_order, true
from prepared
join public.properties p on p.slug = prepared.slug
on conflict (source, source_review_id) do update set
  property_id = excluded.property_id,
  reviewer_name = excluded.reviewer_name,
  review_text = excluded.review_text,
  rating = 5,
  review_date = excluded.review_date,
  review_date_label = excluded.review_date_label,
  display_order = excluded.display_order,
  published = true,
  updated_at = timezone('utc', now());

/* Final verification queries. */
select
  p.slug,
  p.id,
  p.name,
  p.max_guests,
  p.bedrooms,
  p.beds,
  p.bathrooms,
  p.property_type,
  p.nightly_price,
  jsonb_array_length(coalesce(p.listing_details->'amenities', '[]'::jsonb)) as imported_amenity_count,
  count(r.id) filter (where r.rating = 5 and r.source = 'Airbnb' and r.published = true) as imported_five_star_reviews
from public.properties p
left join public.property_reviews r on r.property_id = p.id
where p.slug in ('serenity-7', 'serenity-9', 'serenity-11')
group by p.id
order by p.slug;

select
  case
    when exists (select 1 from public.property_reviews where source = 'Airbnb' and rating <> 5)
      then 'FAIL: a review outside the five-star constraint exists'
    else 'PASS: all imported Airbnb reviews are five-star reviews'
  end as review_rating_check;

select
  case
    when exists (
      select 1
      from serenity_property_images_before before_row
      full outer join (
        select p.slug, pi.id, pi.property_id, pi.storage_path, pi.external_url, pi.alt_text, pi.display_order
        from public.properties p
        join public.property_images pi on pi.property_id = p.id
        where p.slug in ('serenity-7', 'serenity-9', 'serenity-11')
      ) after_row using (id)
      where before_row.id is null
         or after_row.id is null
         or before_row.slug is distinct from after_row.slug
         or before_row.property_id is distinct from after_row.property_id
         or before_row.storage_path is distinct from after_row.storage_path
         or before_row.external_url is distinct from after_row.external_url
         or before_row.alt_text is distinct from after_row.alt_text
         or before_row.display_order is distinct from after_row.display_order
    ) then 'FAIL: an existing property image record changed'
    else 'PASS: existing property image records and URLs were not changed'
  end as image_integrity_check;

commit;
