-- Property CMS fields and a real, category-aware photo manager.
-- This migration is deliberately additive and safe to run after the existing
-- Serenity migrations. It does not delete properties or existing photo rows.

alter table public.properties
  add column if not exists listing_title text not null default '',
  add column if not exists kitchen_facilities text not null default '',
  add column if not exists laundry_facilities text not null default '',
  add column if not exists wifi_information text not null default '',
  add column if not exists workspace_information text not null default '',
  add column if not exists heating_cooling text not null default '',
  add column if not exists self_check_in_details text not null default '',
  add column if not exists safety_information text not null default '',
  add column if not exists cancellation_policy text not null default '',
  add column if not exists corporate_information text not null default '';

alter table public.property_images
  add column if not exists category text not null default 'other',
  add column if not exists category_label text not null default 'Other',
  add column if not exists category_description text not null default '',
  add column if not exists is_cover boolean not null default false,
  add column if not exists is_visible boolean not null default true,
  add column if not exists is_placeholder boolean not null default false,
  add column if not exists original_filename text not null default '',
  add column if not exists file_size bigint,
  add column if not exists mime_type text not null default 'image/webp',
  add column if not exists width integer,
  add column if not exists height integer;

create table if not exists public.property_photo_categories (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  category text not null,
  category_label text not null,
  category_description text not null default '',
  display_order integer not null default 0,
  is_visible boolean not null default true,
  no_photo_available boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint property_photo_categories_category_check check (category ~ '^[a-z0-9-]+$'),
  constraint property_photo_categories_unique unique (property_id, category)
);

create index if not exists property_images_public_order_idx
  on public.property_images (property_id, is_visible, is_cover desc, display_order);
create index if not exists property_photo_categories_public_order_idx
  on public.property_photo_categories (property_id, is_visible, no_photo_available, display_order);

drop trigger if exists property_photo_categories_updated_at on public.property_photo_categories;
create trigger property_photo_categories_updated_at
  before update on public.property_photo_categories
  for each row execute function public.set_updated_at();

alter table public.property_photo_categories enable row level security;

drop policy if exists "Published photo categories are public" on public.property_photo_categories;
create policy "Published photo categories are public"
  on public.property_photo_categories for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.published = true
    )
    or public.is_admin()
  );

drop policy if exists "Admins manage photo categories" on public.property_photo_categories;
create policy "Admins manage photo categories"
  on public.property_photo_categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- Public queries additionally require is_visible/no_photo_available. The
-- storage policy also checks the database row, so an unpublished or hidden
-- image cannot be fetched by its public Storage URL.
drop policy if exists "Published property images are public" on public.property_images;
create policy "Published property images are public"
  on public.property_images for select
  using (
    (
      is_visible = true
      and is_placeholder = false
      and exists (
        select 1 from public.properties p
        where p.id = property_id and p.published = true
      )
    )
    or public.is_admin()
  );

drop policy if exists "Public can read published property images" on storage.objects;
create policy "Public can read published property images"
  on storage.objects for select
  using (
    bucket_id = 'property-images'
    and exists (
      select 1
      from public.property_images i
      join public.properties p on p.id = i.property_id
      where i.storage_path = name
        and i.is_visible = true
        and i.is_placeholder = false
        and p.published = true
    )
  );

-- Keep the existing 5 MB image limit and supported formats in force. The
-- server upload-url route validates the same rules before issuing a signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
