-- Backward-compatible metadata only. Apply through the normal migration process.
-- Existing labels, bed_arrangements JSON, bookings, prices, auth and RLS stay intact.
alter table public.amenities add column if not exists catalog_id text;
alter table public.amenities add column if not exists icon_id text;
alter table public.amenities add column if not exists amenity_group text;
alter table public.property_reviews add column if not exists category_ratings jsonb not null default '{}'::jsonb;
alter table public.property_reviews drop constraint if exists property_reviews_only_five_stars;
alter table public.property_reviews add constraint property_reviews_rating_range check (rating between 1 and 5) not valid;
create or replace function public.valid_review_category_ratings(scores jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(scores) <> 'object' then false else not exists (
    select 1 from jsonb_each(scores) item where item.key not in ('cleanliness','accuracy','check_in','communication','location','value')
      or item.value not in ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'5'::jsonb)
  ) end;
$$;
alter table public.property_reviews add constraint property_reviews_category_range check (public.valid_review_category_ratings(category_ratings));
