/* Server-side guardrails for content edited in the admin CMS. These checks
   preserve the existing JSONB storage shape while preventing content from
   overflowing public layouts. */

create or replace function public.text_array_within_length(input text[], max_length integer)
returns boolean
language sql
immutable
as $$
  select coalesce((select bool_and(char_length(item) <= max_length) from unnest(coalesce(input, '{}'::text[])) as item), true);
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_name_character_limit') then
    alter table public.properties add constraint properties_name_character_limit check (char_length(name) <= 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_short_description_character_limit') then
    alter table public.properties add constraint properties_short_description_character_limit check (char_length(short_description) <= 220);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_full_description_character_limit') then
    alter table public.properties add constraint properties_full_description_character_limit check (char_length(full_description) <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_pet_policy_character_limit') then
    alter table public.properties add constraint properties_pet_policy_character_limit check (char_length(pet_policy) <= 160);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_house_rules_character_limit') then
    alter table public.properties add constraint properties_house_rules_character_limit check (public.text_array_within_length(house_rules, 160));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_nearby_locations_character_limit') then
    alter table public.properties add constraint properties_nearby_locations_character_limit check (public.text_array_within_length(nearby_locations, 100));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_hero_heading_character_limit') then
    alter table public.homepage_content add constraint homepage_hero_heading_character_limit check (char_length(coalesce(content->>'hero_heading', '')) <= 70);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_hero_subtitle_character_limit') then
    alter table public.homepage_content add constraint homepage_hero_subtitle_character_limit check (char_length(coalesce(content->>'hero_subtitle', '')) <= 180);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_button_label_character_limit') then
    alter table public.homepage_content add constraint homepage_button_label_character_limit check (char_length(coalesce(content->>'hero_cta_label', '')) <= 28);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_section_description_character_limit') then
    alter table public.homepage_content add constraint homepage_section_description_character_limit check (char_length(coalesce(content->>'section_description', '')) <= 300);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'property_reviews_text_character_limit') then
    alter table public.property_reviews add constraint property_reviews_text_character_limit check (char_length(review_text) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bookings_notes_character_limit') then
    alter table public.bookings add constraint bookings_notes_character_limit check (char_length(notes) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'enquiries_notes_character_limit') then
    alter table public.enquiries add constraint enquiries_notes_character_limit check (char_length(notes) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'enquiries_contact_name_character_limit') then
    alter table public.enquiries add constraint enquiries_contact_name_character_limit check (char_length(contact_name) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'enquiries_email_character_limit') then
    alter table public.enquiries add constraint enquiries_email_character_limit check (char_length(email) <= 150);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'enquiries_phone_character_limit') then
    alter table public.enquiries add constraint enquiries_phone_character_limit check (char_length(phone) <= 30);
  end if;
end $$;
