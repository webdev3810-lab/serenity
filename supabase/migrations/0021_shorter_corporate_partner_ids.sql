-- Preserve existing IDs while issuing shorter IDs for all new partner accounts.
alter table public.corporate_partners
  alter column partner_id set default ('SER-' || upper(encode(gen_random_bytes(6), 'hex')));
