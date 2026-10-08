-- Preserve existing IDs while issuing shorter IDs for all new partner accounts.
alter table public.corporate_partners
  alter column partner_id set default ('SER-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)));
