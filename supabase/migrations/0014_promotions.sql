/* Safe, additive promotions and voucher support. Nothing in this migration
   deletes existing content, bookings, media, or site settings. */

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  badge_text text not null default '' check (char_length(badge_text) <= 40),
  message text not null default '' check (char_length(message) <= 140),
  mobile_message text not null default '' check (char_length(mobile_message) <= 90),
  code text not null check (char_length(code) between 1 and 40),
  discount_type text not null check (discount_type in ('percentage', 'fixed_aud')),
  discount_value numeric(12,2) not null check (discount_value >= 0 and (discount_type <> 'percentage' or discount_value <= 100)),
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  successful_redemptions integer not null default 0 check (successful_redemptions >= 0),
  reserved_redemptions integer not null default 0 check (reserved_redemptions >= 0),
  minimum_booking_amount numeric(12,2) not null default 0 check (minimum_booking_amount >= 0),
  minimum_nights integer not null default 0 check (minimum_nights >= 0),
  applicable_property_ids uuid[] not null default '{}',
  applies_to_corporate boolean not null default false,
  stackable boolean not null default false,
  restore_on_refund boolean not null default false,
  active boolean not null default false,
  published boolean not null default false,
  header_visible boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint promotions_date_order check (ends_at is null or starts_at is null or ends_at > starts_at)
);

alter table public.promotions add column if not exists reserved_redemptions integer not null default 0;
alter table public.promotions add column if not exists restore_on_refund boolean not null default false;
create unique index if not exists promotions_code_lower_idx on public.promotions (lower(code));

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  stripe_checkout_session_id text,
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'released', 'refunded')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint promotion_redemptions_booking_unique unique (promotion_id, booking_id)
);

create unique index if not exists promotion_redemptions_session_unique_idx
  on public.promotion_redemptions (promotion_id, stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

alter table public.bookings add column if not exists promotion_id uuid references public.promotions(id) on delete set null;
alter table public.bookings add column if not exists promotion_code text;
alter table public.bookings add column if not exists promotion_discount numeric(12,2) not null default 0;
alter table public.bookings add column if not exists promotion_redemption_id uuid references public.promotion_redemptions(id) on delete set null;

drop trigger if exists promotions_updated_at on public.promotions;
create trigger promotions_updated_at before update on public.promotions for each row execute function public.set_updated_at();
drop trigger if exists promotion_redemptions_updated_at on public.promotion_redemptions;
create trigger promotion_redemptions_updated_at before update on public.promotion_redemptions for each row execute function public.set_updated_at();

alter table public.promotions enable row level security;
alter table public.promotion_redemptions enable row level security;
drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions for select using (published = true and active = true);
drop policy if exists promotions_admin_manage on public.promotions;
create policy promotions_admin_manage on public.promotions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists promotion_redemptions_admin_manage on public.promotion_redemptions;
create policy promotion_redemptions_admin_manage on public.promotion_redemptions for all using (public.is_admin()) with check (public.is_admin());

/* Reserve a slot while a Stripe checkout is open. Pending reservations do
   not count as successful redemptions and are released on cancellation,
   expiry, or a failed checkout. The row lock makes the capacity check safe
   when multiple guests pay at the same time. */
create or replace function public.reserve_promotion_redemption(
  p_promotion_id uuid,
  p_booking_id uuid,
  p_code text,
  p_discount_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  promotion_row public.promotions%rowtype;
  redemption_row public.promotion_redemptions%rowtype;
begin
  select * into promotion_row from public.promotions where id = p_promotion_id for update;
  if not found then raise exception 'Promotion not found'; end if;
  if lower(promotion_row.code) <> lower(trim(p_code)) then raise exception 'Promotion code mismatch'; end if;
  if not promotion_row.active or not promotion_row.published then raise exception 'Promotion is not active'; end if;
  if promotion_row.starts_at is not null and now() < promotion_row.starts_at then raise exception 'Promotion has not started'; end if;
  if promotion_row.ends_at is not null and now() >= promotion_row.ends_at then raise exception 'Promotion has expired'; end if;
  if promotion_row.max_redemptions is not null and promotion_row.successful_redemptions + promotion_row.reserved_redemptions >= promotion_row.max_redemptions then raise exception 'Promotion is sold out'; end if;

  select * into redemption_row from public.promotion_redemptions
    where promotion_id = p_promotion_id and booking_id = p_booking_id for update;
  if found then
    if redemption_row.status = 'pending' or redemption_row.status = 'confirmed' then return redemption_row.id; end if;
    update public.promotion_redemptions
      set status = 'pending', discount_amount = greatest(0, p_discount_amount)
      where id = redemption_row.id;
    update public.promotions set reserved_redemptions = reserved_redemptions + 1 where id = p_promotion_id;
    return redemption_row.id;
  end if;

  insert into public.promotion_redemptions (promotion_id, booking_id, discount_amount)
    values (p_promotion_id, p_booking_id, greatest(0, p_discount_amount))
    returning id into redemption_row.id;
  update public.promotions set reserved_redemptions = reserved_redemptions + 1 where id = p_promotion_id;
  return redemption_row.id;
end;
$$;

create or replace function public.confirm_promotion_redemption(
  p_redemption_id uuid,
  p_booking_id uuid,
  p_session_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  redemption_row public.promotion_redemptions%rowtype;
  promotion_row public.promotions%rowtype;
begin
  select * into redemption_row from public.promotion_redemptions where id = p_redemption_id and booking_id = p_booking_id for update;
  if not found then raise exception 'Promotion redemption not found'; end if;
  if redemption_row.status = 'confirmed' then return; end if;
  if redemption_row.status <> 'pending' then return; end if;
  select * into promotion_row from public.promotions where id = redemption_row.promotion_id for update;
  if promotion_row.max_redemptions is not null and promotion_row.successful_redemptions >= promotion_row.max_redemptions then raise exception 'Promotion capacity has been reached'; end if;
  update public.promotion_redemptions
    set status = 'confirmed', stripe_checkout_session_id = coalesce(p_session_id, stripe_checkout_session_id)
    where id = p_redemption_id;
  update public.promotions
    set reserved_redemptions = greatest(0, reserved_redemptions - 1), successful_redemptions = successful_redemptions + 1
    where id = redemption_row.promotion_id;
end;
$$;

create or replace function public.release_promotion_redemption(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  redemption_row public.promotion_redemptions%rowtype;
begin
  select * into redemption_row from public.promotion_redemptions where booking_id = p_booking_id and status = 'pending' for update;
  if not found then return; end if;
  update public.promotion_redemptions set status = 'released' where id = redemption_row.id;
  update public.promotions set reserved_redemptions = greatest(0, reserved_redemptions - 1) where id = redemption_row.promotion_id;
end;
$$;

create or replace function public.restore_promotion_redemption(p_redemption_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  redemption_row public.promotion_redemptions%rowtype;
  promotion_row public.promotions%rowtype;
begin
  select * into redemption_row from public.promotion_redemptions where id = p_redemption_id for update;
  if not found or redemption_row.status <> 'confirmed' then return; end if;
  select * into promotion_row from public.promotions where id = redemption_row.promotion_id for update;
  if not promotion_row.restore_on_refund then return; end if;
  update public.promotion_redemptions set status = 'refunded' where id = p_redemption_id;
  update public.promotions set successful_redemptions = greatest(0, successful_redemptions - 1) where id = redemption_row.promotion_id;
end;
$$;

revoke all on function public.reserve_promotion_redemption(uuid, uuid, text, numeric) from public, anon, authenticated;
revoke all on function public.confirm_promotion_redemption(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.release_promotion_redemption(uuid) from public, anon, authenticated;
revoke all on function public.restore_promotion_redemption(uuid) from public, anon, authenticated;
grant execute on function public.reserve_promotion_redemption(uuid, uuid, text, numeric) to service_role;
grant execute on function public.confirm_promotion_redemption(uuid, uuid, text) to service_role;
grant execute on function public.release_promotion_redemption(uuid) to service_role;
grant execute on function public.restore_promotion_redemption(uuid) to service_role;
