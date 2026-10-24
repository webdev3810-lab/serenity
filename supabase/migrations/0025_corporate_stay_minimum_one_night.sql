-- Corporate stays have their own minimum, independent of the direct-booking minimum.
alter table public.properties
  drop constraint if exists properties_corporate_rules_check;

alter table public.properties
  alter column minimum_corporate_stay set default 1;

-- Move houses still using the old seven-night default to the new default.
update public.properties
set minimum_corporate_stay = 1
where minimum_corporate_stay = 7;

alter table public.properties
  add constraint properties_corporate_rules_check check (
    minimum_corporate_stay >= 1
    and minimum_corporate_houses between 1 and maximum_corporate_houses
    and maximum_corporate_houses between 1 and 3
    and corporate_discount between 0 and 100
    and char_length(corporate_instructions) <= 1000
  );
