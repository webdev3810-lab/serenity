create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin')),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and active = true
  );
$$;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  property_type text not null default 'Entire furnished house',
  location text not null,
  short_description text not null default '',
  full_description text not null default '',
  max_guests integer not null default 1 check (max_guests > 0),
  bedrooms integer not null default 1 check (bedrooms > 0),
  beds integer not null default 1 check (beds > 0),
  bathrooms numeric(4,1) not null default 1 check (bathrooms > 0),
  bed_arrangements jsonb not null default '[]'::jsonb,
  check_in_time text not null default '3:00 PM',
  checkout_time text not null default '11:00 AM',
  pet_policy text not null default '',
  parking_type text not null default '',
  nightly_price numeric(12,2) not null default 0 check (nightly_price >= 0),
  cleaning_fee numeric(12,2) not null default 0 check (cleaning_fee >= 0),
  pet_fee numeric(12,2) not null default 0 check (pet_fee >= 0),
  extra_guest_fee numeric(12,2) not null default 0 check (extra_guest_fee >= 0),
  extra_guest_threshold integer not null default 1 check (extra_guest_threshold >= 0),
  minimum_stay integer not null default 1 check (minimum_stay > 0),
  weekly_discount numeric(5,2) not null default 0 check (weekly_discount between 0 and 100),
  monthly_discount numeric(5,2) not null default 0 check (monthly_discount between 0 and 100),
  house_rules text[] not null default '{}',
  nearby_locations text[] not null default '{}',
  unavailable_dates date[] not null default '{}',
  latitude numeric(10,7),
  longitude numeric(10,7),
  published boolean not null default false,
  featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text,
  external_url text,
  alt_text text not null default '',
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint property_images_source check (storage_path is not null or external_url is not null)
);

create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  property_id uuid not null references public.properties(id),
  check_in date not null,
  checkout date not null,
  adults integer not null default 1 check (adults > 0),
  children integer not null default 0 check (children >= 0),
  infants integer not null default 0 check (infants >= 0),
  pets integer not null default 0 check (pets >= 0),
  guest_details jsonb not null default '{}'::jsonb,
  corporate_details jsonb not null default '{}'::jsonb,
  price_breakdown jsonb not null default '{}'::jsonb,
  total numeric(12,2) not null default 0 check (total >= 0),
  currency text not null default 'AUD',
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  booking_status text not null default 'pending_payment' check (booking_status in ('pending_payment', 'confirmed', 'corporate', 'cancelled', 'checked_in', 'checked_out', 'expired')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bookings_date_order check (checkout > check_in)
);

alter table public.bookings
  drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap exclude using gist (
    property_id with =,
    daterange(check_in, checkout, '[)') with &&
  ) where (booking_status in ('pending_payment', 'confirmed', 'corporate', 'checked_in'));

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null default '',
  arrival date,
  departure date,
  guests text not null default '',
  houses_needed text not null default '1',
  purpose text not null default '',
  notes text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'pending_approval', 'approved', 'declined')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.homepage_content (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique default 'home',
  content jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists properties_slug_idx on public.properties (slug);
create index if not exists properties_published_order_idx on public.properties (published, display_order);
create index if not exists property_images_property_order_idx on public.property_images (property_id, display_order);
create index if not exists bookings_dates_status_idx on public.bookings (property_id, check_in, checkout, booking_status);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists enquiries_created_at_idx on public.enquiries (created_at desc);

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at before update on public.properties for each row execute function public.set_updated_at();
drop trigger if exists property_images_updated_at on public.property_images;
create trigger property_images_updated_at before update on public.property_images for each row execute function public.set_updated_at();
drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
drop trigger if exists enquiries_updated_at on public.enquiries;
create trigger enquiries_updated_at before update on public.enquiries for each row execute function public.set_updated_at();
drop trigger if exists homepage_content_updated_at on public.homepage_content;
create trigger homepage_content_updated_at before update on public.homepage_content for each row execute function public.set_updated_at();

alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.amenities enable row level security;
alter table public.bookings enable row level security;
alter table public.enquiries enable row level security;
alter table public.homepage_content enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_users enable row level security;

create policy "Published properties are public" on public.properties for select using (published = true or public.is_admin());
create policy "Admins manage properties" on public.properties for all using (public.is_admin()) with check (public.is_admin());
create policy "Published property images are public" on public.property_images for select using (exists (select 1 from public.properties p where p.id = property_id and p.published = true) or public.is_admin());
create policy "Admins manage property images" on public.property_images for all using (public.is_admin()) with check (public.is_admin());
create policy "Published amenities are public" on public.amenities for select using (exists (select 1 from public.properties p where p.id = property_id and p.published = true) or public.is_admin());
create policy "Admins manage amenities" on public.amenities for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage bookings" on public.bookings for all using (public.is_admin()) with check (public.is_admin());
create policy "Public can create enquiries" on public.enquiries for insert with check (true);
create policy "Admins manage enquiries" on public.enquiries for all using (public.is_admin()) with check (public.is_admin());
create policy "Published homepage content is public" on public.homepage_content for select using (published = true or public.is_admin());
create policy "Admins manage homepage content" on public.homepage_content for all using (public.is_admin()) with check (public.is_admin());
create policy "Public settings are readable" on public.site_settings for select using (is_public = true or public.is_admin());
create policy "Admins manage site settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can read their own admin row" on public.admin_users for select using (auth.uid() = user_id or public.is_admin());
create policy "Admins manage admin rows" on public.admin_users for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read published property images" on storage.objects for select using (bucket_id = 'property-images');
create policy "Admins can upload property images" on storage.objects for insert with check (bucket_id = 'property-images' and public.is_admin());
create policy "Admins can update property images" on storage.objects for update using (bucket_id = 'property-images' and public.is_admin()) with check (bucket_id = 'property-images' and public.is_admin());
create policy "Admins can delete property images" on storage.objects for delete using (bucket_id = 'property-images' and public.is_admin());
