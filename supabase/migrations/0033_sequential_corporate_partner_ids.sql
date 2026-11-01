-- Existing partners receive readable IDs, with HRS first and the Test account reserved.
create sequence if not exists public.corporate_partner_number_seq start with 1;

create or replace function public.next_corporate_partner_id()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  partner_number bigint;
  letter text;
begin
  partner_number := nextval('public.corporate_partner_number_seq'::regclass);
  letter := chr(65 + ((partner_number - 1) % 26)::integer);
  return 'SER-' || letter || letter || lpad(partner_number::text, 3, '0');
end;
$$;

revoke all on function public.next_corporate_partner_id() from public;
grant execute on function public.next_corporate_partner_id() to service_role;

do $$
declare
  test_partner_id uuid;
  partner record;
  partner_number bigint := 0;
  letter text;
begin
  select id into test_partner_id
  from public.corporate_partners
  where lower(btrim(company_name)) = 'test'
  order by created_at, id
  limit 1;

  -- Release old values first so a partially numbered database cannot conflict.
  update public.corporate_partners
  set partner_id = 'MIG-' || id::text
  where id is distinct from test_partner_id;

  for partner in
    select id
    from public.corporate_partners
    where id is distinct from test_partner_id
    order by case when lower(btrim(company_name)) = 'hrs' then 0 else 1 end,
             created_at, id
  loop
    partner_number := partner_number + 1;
    letter := chr(65 + ((partner_number - 1) % 26)::integer);
    update public.corporate_partners
    set partner_id = 'SER-' || letter || letter || lpad(partner_number::text, 3, '0')
    where id = partner.id;
  end loop;

  if test_partner_id is not null then
    update public.corporate_partners
    set partner_id = 'ADM-ZZ000'
    where id = test_partner_id;
  end if;

  perform setval('public.corporate_partner_number_seq'::regclass,
                 greatest(partner_number, 1), partner_number > 0);
end;
$$;

alter table public.corporate_partners
  alter column partner_id set default public.next_corporate_partner_id();
