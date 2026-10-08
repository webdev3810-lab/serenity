create table if not exists public.corporate_partners (
  id uuid primary key default gen_random_uuid(),
  partner_id text not null unique default ('SER-' || upper(encode(gen_random_bytes(6), 'hex'))),
  company_name text not null check (char_length(company_name) between 1 and 160),
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 150),
  phone text not null check (char_length(phone) between 1 and 30),
  abn text not null default '' check (char_length(abn) <= 30),
  purchase_order text not null default '' check (char_length(purchase_order) <= 120),
  invoice_requested boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists corporate_partners_updated_at on public.corporate_partners;
create trigger corporate_partners_updated_at before update on public.corporate_partners for each row execute function public.set_updated_at();

alter table public.corporate_partners enable row level security;
drop policy if exists "Admins manage corporate partners" on public.corporate_partners;
create policy "Admins manage corporate partners" on public.corporate_partners for all using (public.is_admin()) with check (public.is_admin());
