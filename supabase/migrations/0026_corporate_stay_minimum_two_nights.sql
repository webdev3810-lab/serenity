-- All current houses use a two-night corporate minimum; new houses inherit it.
alter table public.properties
  drop constraint if exists properties_corporate_rules_check;

alter table public.properties
  alter column minimum_corporate_stay set default 2;

update public.properties
set minimum_corporate_stay = 2;

alter table public.properties
  add constraint properties_corporate_rules_check check (
    minimum_corporate_stay >= 2
    and minimum_corporate_houses between 1 and maximum_corporate_houses
    and maximum_corporate_houses between 1 and 3
    and corporate_discount between 0 and 100
    and char_length(corporate_instructions) <= 1000
  );
