-- New property photos are uploaded into a shared, hidden staging category.
-- Room categories keep the existing five-photo limit; staging is unlimited so
-- an admin can upload a batch and organise it afterwards.

insert into public.property_photo_categories (
  property_id,
  category,
  category_label,
  category_description,
  display_order,
  is_visible,
  no_photo_available
)
select
  p.id,
  'unsorted',
  'Unsorted uploads',
  'New uploads stay hidden until they are assigned to a room and published.',
  -1,
  true,
  false
from public.properties p
on conflict (property_id, category) do update set
  category_label = excluded.category_label,
  category_description = excluded.category_description;

update public.property_images
set is_visible = false,
    is_cover = false,
    updated_at = timezone('utc', now())
where category = 'unsorted';

create or replace function public.enforce_property_gallery_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.category := coalesce(nullif(trim(new.category), ''), 'unsorted');
  new.category_label := coalesce(
    nullif(trim(new.category_label), ''),
    case when new.category = 'unsorted' then 'Unsorted uploads' else 'Other' end
  );

  if new.category <> 'unsorted' then
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
