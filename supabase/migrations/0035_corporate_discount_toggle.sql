-- Existing and new houses start with the corporate accommodation discount off.
-- Keep each house's configured percentage so it can be enabled later.
alter table public.properties
  add column if not exists corporate_discount_enabled boolean not null default false;
