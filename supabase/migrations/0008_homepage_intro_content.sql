/* Guardrails for the editable editorial intro section. */

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_intro_eyebrow_character_limit') then
    alter table public.homepage_content add constraint homepage_intro_eyebrow_character_limit check (char_length(coalesce(content->>'intro_eyebrow', '')) <= 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_intro_heading_character_limit') then
    alter table public.homepage_content add constraint homepage_intro_heading_character_limit check (char_length(coalesce(content->>'intro_heading', '')) <= 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_intro_lead_character_limit') then
    alter table public.homepage_content add constraint homepage_intro_lead_character_limit check (char_length(coalesce(content->>'intro_lead', '')) <= 300);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_intro_body_character_limit') then
    alter table public.homepage_content add constraint homepage_intro_body_character_limit check (char_length(coalesce(content->>'intro_body', '')) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_intro_cta_label_character_limit') then
    alter table public.homepage_content add constraint homepage_intro_cta_label_character_limit check (char_length(coalesce(content->>'intro_cta_label', '')) <= 28);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_intro_art_label_character_limit') then
    alter table public.homepage_content add constraint homepage_intro_art_label_character_limit check (char_length(coalesce(content->>'intro_art_label', '')) <= 32);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_intro_art_heading_character_limit') then
    alter table public.homepage_content add constraint homepage_intro_art_heading_character_limit check (char_length(coalesce(content->>'intro_art_heading', '')) <= 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_intro_art_card_character_limit') then
    alter table public.homepage_content add constraint homepage_intro_art_card_character_limit check (char_length(coalesce(content->>'intro_art_card', '')) <= 120);
  end if;
end $$;
