-- Keep the property gallery rules enforced even when rows are changed outside
-- the admin browser UI.

create or replace function public.enforce_property_gallery_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.category := coalesce(nullif(trim(new.category), ''), 'other');
  new.category_label := coalesce(nullif(trim(new.category_label), ''), 'Other');

  if tg_op = 'INSERT' then
    if (
      select count(*)
      from public.property_images existing
      where existing.property_id = new.property_id
        and existing.category = new.category
        and existing.id is distinct from new.id
    ) >= 5 then
      raise exception 'A property photo category can contain at most 5 images.' using errcode = 'check_violation';
    end if;
  elsif old.property_id is distinct from new.property_id
    or old.category is distinct from new.category then
    if (
      select count(*)
      from public.property_images existing
      where existing.property_id = new.property_id
        and existing.category = new.category
        and existing.id is distinct from new.id
    ) >= 5 then
      raise exception 'A property photo category can contain at most 5 images.' using errcode = 'check_violation';
    end if;
  end if;

  if new.is_cover = true then
    update public.property_images
    set is_cover = false,
        updated_at = timezone('utc', now())
    where property_id = new.property_id
      and id is distinct from new.id
      and is_cover = true;
  end if;

  return new;
end;
$$;

drop trigger if exists property_images_gallery_rules on public.property_images;
create trigger property_images_gallery_rules
  before insert or update of property_id, category, category_label, is_cover
  on public.property_images
  for each row execute function public.enforce_property_gallery_rules();
