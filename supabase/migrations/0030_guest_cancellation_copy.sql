-- Bring saved guest guide copy into line with the per-house policy without
-- replacing administrator-written variations.
update public.homepage_content
set content = replace(
  replace(
    content::text,
    'Submit cancellation and amendment requests as early as possible.',
    'Contact Serenity to request a cancellation or amendment.'
  ),
  'Refunds, if applicable, depend on the booking terms, notice period, and booking channel.',
  'For direct bookings, free cancellation is available through 11:59 pm Melbourne time on the deadline shown before payment. The default is seven days before check-in and can vary by house.'
)::jsonb
where page_key = 'guest-information'
  and (
    content::text like '%Submit cancellation and amendment requests as early as possible.%'
    or content::text like '%Refunds, if applicable, depend on the booking terms, notice period, and booking channel.%'
  );
