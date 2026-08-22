-- Homepage hero media is kept separate from property photos so editors can
-- publish a small, ordered image/video sequence without changing listings.

create table if not exists public.homepage_hero_media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm')),
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  alt_text text not null default '' check (char_length(alt_text) <= 180),
  caption text not null default '' check (char_length(caption) <= 180),
  display_order integer not null default 0 check (display_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists homepage_hero_media_active_order_idx
  on public.homepage_hero_media (active, display_order, created_at);

create index if not exists homepage_hero_media_storage_path_idx
  on public.homepage_hero_media (storage_path);

create or replace function public.enforce_homepage_hero_media_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('serenity:homepage-hero-media-limit'));
  if tg_op = 'INSERT' and (select count(*) from public.homepage_hero_media) >= 5 then
    raise exception 'A maximum of five homepage hero media items is allowed.';
  end if;
  return new;
end;
$$;

drop trigger if exists homepage_hero_media_limit on public.homepage_hero_media;
create trigger homepage_hero_media_limit
  before insert on public.homepage_hero_media
  for each row execute function public.enforce_homepage_hero_media_limit();

drop trigger if exists homepage_hero_media_updated_at on public.homepage_hero_media;
create trigger homepage_hero_media_updated_at
  before update on public.homepage_hero_media
  for each row execute function public.set_updated_at();

alter table public.homepage_hero_media enable row level security;

drop policy if exists "Active hero media is public" on public.homepage_hero_media;
create policy "Active hero media is public"
  on public.homepage_hero_media for select
  using (active = true);

drop policy if exists "Admins manage hero media" on public.homepage_hero_media;
create policy "Admins manage hero media"
  on public.homepage_hero_media for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hero-media',
  'hero-media',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read hero media" on storage.objects;
drop policy if exists "Admins can read hero media" on storage.objects;
create policy "Admins can read hero media"
  on storage.objects for select
  using (bucket_id = 'hero-media' and public.is_admin());

drop policy if exists "Admins can upload hero media" on storage.objects;
create policy "Admins can upload hero media"
  on storage.objects for insert
  with check (bucket_id = 'hero-media' and public.is_admin());

drop policy if exists "Admins can update hero media" on storage.objects;
create policy "Admins can update hero media"
  on storage.objects for update
  using (bucket_id = 'hero-media' and public.is_admin())
  with check (bucket_id = 'hero-media' and public.is_admin());

drop policy if exists "Admins can delete hero media" on storage.objects;
create policy "Admins can delete hero media"
  on storage.objects for delete
  using (bucket_id = 'hero-media' and public.is_admin());
