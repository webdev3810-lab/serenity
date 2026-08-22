/* Keep homepage FAQ entries editable in the JSONB homepage CMS while adding
   database-level limits that match the admin validation rules. */

create or replace function public.homepage_faqs_within_length(input jsonb)
returns boolean
language sql
immutable
as $$
  select case
    when input is null then true
    when jsonb_typeof(input) <> 'array' then false
    else coalesce((
      select bool_and(
        case
          when jsonb_typeof(item) <> 'object' then false
          else char_length(coalesce(item->>'question', '')) <= 140
            and char_length(coalesce(item->>'answer', '')) <= 700
        end
      )
      from jsonb_array_elements(input) as item
    ), true)
  end;
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_faqs_character_limit') then
    alter table public.homepage_content
      add constraint homepage_faqs_character_limit
      check (public.homepage_faqs_within_length(content->'faqs'));
  end if;
end $$;
