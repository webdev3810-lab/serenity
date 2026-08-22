-- Optional dated nightly overrides for peak seasons, events, and special periods.
create table if not exists public.property_date_prices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  price_date date not null,
  nightly_price numeric(12,2) not null check (nightly_price >= 0),
  label text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint property_date_prices_unique_date unique (property_id, price_date),
  constraint property_date_prices_label_length check (char_length(label) <= 120)
);

create index if not exists property_date_prices_lookup_idx on public.property_date_prices (property_id, price_date);

drop trigger if exists property_date_prices_updated_at on public.property_date_prices;
create trigger property_date_prices_updated_at before update on public.property_date_prices for each row execute function public.set_updated_at();

alter table public.property_date_prices enable row level security;

create policy "Published property date prices are public" on public.property_date_prices
  for select using (exists (select 1 from public.properties p where p.id = property_id and p.published = true));
create policy "Admins manage property date prices" on public.property_date_prices
  for all using (public.is_admin()) with check (public.is_admin());
