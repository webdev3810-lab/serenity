update public.homepage_content
set content = content
  - 'intro_eyebrow'
  - 'intro_heading'
  - 'intro_lead'
  - 'intro_body'
  - 'intro_cta_label'
  - 'intro_cta_href'
  - 'intro_art_label'
  - 'intro_art_heading'
  - 'intro_art_card'
  - 'intro_image_1'
  - 'intro_image_1_path'
  - 'intro_image_2'
  - 'intro_image_2_path'
where page_key = 'home';

alter table public.homepage_content
  drop constraint if exists homepage_intro_eyebrow_character_limit,
  drop constraint if exists homepage_intro_heading_character_limit,
  drop constraint if exists homepage_intro_lead_character_limit,
  drop constraint if exists homepage_intro_body_character_limit,
  drop constraint if exists homepage_intro_cta_label_character_limit,
  drop constraint if exists homepage_intro_art_label_character_limit,
  drop constraint if exists homepage_intro_art_heading_character_limit,
  drop constraint if exists homepage_intro_art_card_character_limit;
