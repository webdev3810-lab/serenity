# Serenity House Booking App Brief

## Goal

Build a direct-booking website for furnished whole-house stays, using the presentation style of Melbourne Furnished Apartments and the booking/checkout pattern guests expect from Airbnb. The site should focus on Serenity houses in Pakenham, Victoria, with support for leisure guests, families, contractors, relocations, extended stays, and corporate bookings.

Important property note: the three Serenity houses are beside each other. This should be highlighted throughout the website because it is a strong advantage for larger families, work crews, corporate teams, relocations, and multi-house group bookings.

Locale note: the business should be presented as operating in South Melbourne, Australia. All dates, times, currency, addresses, phone numbers, tax labels, and booking language should follow Australian formatting and expectations.

## Reference Direction

- Primary website feel: Melbourne Furnished Apartments style with a clean accommodation homepage, prominent search bar, property cards, furnished-stay positioning, corporate and extended-stay content, and direct contact details.
- Booking flow inspiration: Airbnb-style property pages with photo gallery, dates, guest selector, sticky price card, clear fees, guest details, payment, and confirmation.
- Payment processor: Stripe. Use Stripe Checkout or Stripe Payment Element for real card payments, Apple Pay, Google Pay, receipts, refunds, and secure PCI-compliant handling.

Do not copy text, branding, layouts, photos, or design assets directly from the reference websites. Use them only as product and interaction references.

## Target Audience

- Families needing short stays.
- Business travellers and consultants.
- Corporate teams and contractors.
- Relocating employees.
- Insurance or temporary accommodation guests.
- Long-stay guests needing furnished housing.
- Guests travelling with pets.

## Brand Positioning

Serenity should feel practical, trustworthy, and comfortable. The product is not a luxury hotel marketplace; it is a direct-booking platform for furnished private houses.

Suggested positioning:

> Furnished whole-house stays in Pakenham for families, work crews, relocations, corporate guests, and extended stays.

## Design Direction

Use a black, brown, and white visual style. The design should feel premium, calm, and direct, with enough warmth from brown tones to suit furnished house accommodation.

### Colour Palette

- Primary black: `#111111` for headings, navigation, footer, primary buttons, and strong UI contrast.
- Soft black: `#1E1B18` for dark panels and booking cards.
- Warm brown: `#7A4E2D` for accents, icons, active filters, highlights, and small branded details.
- Light brown: `#B88A5A` for hover states, dividers, badges, and secondary highlights.
- Warm off-white: `#F8F5F1` for page backgrounds.
- Pure white: `#FFFFFF` for cards, forms, search panels, and booking surfaces.
- Border neutral: `#E7DED4` for subtle card and form borders.
- Text muted: `#6F6258` for supporting copy.

### Visual Style

- Keep the interface mostly white and off-white, with black used for strong structure and brown used as the brand accent.
- Use black primary buttons with white text.
- Use brown for secondary buttons, selected calendar dates, price highlights, and corporate booking callouts.
- Buttons should be square or slightly softened rectangles, not pill-shaped or very round.
- Button radius should be around 4px to 6px.
- Avoid bright colours, gradients, purple, blue-heavy palettes, and overly decorative backgrounds.
- Use real property photos as the strongest visual element.
- Cards should be clean with subtle borders and light shadows.
- Corners should be modest, around 8px to 12px, so the site feels polished and professional.
- Typography should be clear and modern, with strong black headings and readable body copy.

### Page Design Notes

- Home page: white/off-white background, black hero text, brown accent buttons, and large property photos.
- Search bar: white panel with black labels, brown active states, and a black search button.
- Property cards: white cards, black property names, muted brown location text, brown amenity badges.
- Property detail page: Airbnb-style photo grid, black headings, white booking card, brown selected date states.
- Booking flow: simple white forms, black progress states, brown highlights for totals and corporate options.
- Corporate booking section: use a darker black/brown band to make it distinct from leisure booking.
- Footer: black background, white text, brown hover/accent links.

## Localisation And Formatting

The app should use Australian formatting throughout because the accommodation business is in South Melbourne, Australia.

Required formatting:

- Currency: Australian dollars, shown as AUD or `$` with Australian context.
- Date format: Australian day-month-year format, such as `9 August 2026` or `09/08/2026`.
- Time format: Australian local time, such as `3:00 PM` and `11:00 AM`.
- Timezone: Australia/Melbourne.
- Phone format: Australian phone number format, such as `+61 3 9000 0000` for landline or `+61 4XX XXX XXX` for mobile.
- Address format: street address, suburb, VIC postcode, Australia.
- Tax language: use Australian GST/tax wording where applicable.
- Spelling: use Australian English, such as `centre`, `traveller`, `furnished accommodation`, and `enquiry`.
- Location wording: refer to South Melbourne, Melbourne, Victoria, and Australia where appropriate.

Guest-facing examples:

- `Check-in after 3:00 PM`
- `Checkout before 11:00 AM`
- `Total AUD`
- `South Melbourne, VIC, Australia`
- `Phone: +61 3 9000 0000`

## Vercel And Supabase Free-Tier Optimisation

The first production version must be designed to stay within the Vercel and Supabase free plans as much as reasonably possible. Re-check the current plan quotas before launch because provider limits can change.

### Image Upload Rules

- The maximum accepted file size is **5 MB per image**.
- Enforce the 5 MB limit twice: in the browser before upload and again in the server/API validation.
- Reject unsupported file types. Accept common web formats such as JPEG, PNG, WebP, and AVIF only when the processing pipeline supports them.
- Compress and resize images in the browser before uploading. Do not send the original large file through a Vercel Function.
- Resize large photos to a sensible maximum long edge, such as 2,400 pixels, while keeping the correct aspect ratio.
- Prefer WebP or AVIF output for delivery, with a sensible quality target around 75–85. Keep JPEG as a fallback when required.
- Do not store multiple copies of the original unless there is a clear business requirement. The default workflow should store the optimised image and its generated display variants only.
- Generate responsive variants for thumbnail/card, gallery, and detail views. Do not load a full-size property photo into a small card.
- Store image files in Supabase Storage, not in Postgres rows. Store only the file path, dimensions, size, MIME type, alt text, and ordering metadata in the database.
- Remove or replace old image variants when an admin deletes or replaces a photo so unused files do not accumulate in storage.
- Use stable, cacheable file paths and long cache headers for immutable image variants.

### Vercel Bandwidth And Runtime Rules

- Use `next/image` or an equivalent responsive image strategy with explicit `sizes`, lazy loading for below-the-fold images, and low-quality placeholders where useful.
- Do not embed images as base64 data in page HTML, JSON, or database records.
- Do not proxy image uploads through Vercel serverless functions. Use a short-lived signed upload URL or a direct Supabase Storage upload after the server authorises the request.
- Keep server responses small: select only the columns needed by each screen, paginate admin tables, and never return unbounded booking or image lists.
- Cache public property content and availability reads where safe. Use revalidation or tagged cache invalidation instead of refetching the same data on every request.
- Avoid polling. Use user-triggered refreshes or appropriately throttled/revalidated requests for admin data.
- Debounce search/filter requests and avoid sending a request for every keystroke.
- Keep client components limited to interactive areas such as calendars, booking controls, forms, and the admin dashboard. Render static marketing and property content on the server where possible.
- Do not put secrets, Supabase service-role keys, or Stripe secret keys in client code.

### Supabase Storage And Database Rules

- Configure a dedicated property-images bucket with clear size and MIME-type restrictions.
- Keep Storage policies and database Row Level Security enabled. Only authenticated admins may create, replace, or delete property images.
- Public guests may read only the published property images and public property data needed by the site.
- Add indexes for booking availability checks, property slugs, reservation status, check-in, checkout, and created-at fields.
- Use bounded queries with explicit `select` lists, `limit`, pagination, and ordering. Avoid `select *` in production screens.
- Avoid N+1 queries. Load property data and related image metadata in predictable, batched queries.
- Store image metadata and booking data in Supabase, but keep large binary files in Storage.
- Add rate limits or abuse protection to public booking, enquiry, and upload-related endpoints.

### Image Performance Targets

- A normal property card image should normally be below 250 KB.
- A gallery/detail image should normally be below 1 MB after optimisation.
- A page should load only the images visible in the current viewport first.
- Every uploaded image must have useful alt text, a responsive width, a compressed delivery format, and a recorded file size.
- The upload flow must show the compressed output size before saving and explain why a file was rejected.

These requirements are launch blockers: no upload may bypass the 5 MB limit, no original image should be sent through a Vercel Function by default, and no page should request an unbounded collection of images or bookings.

## Main Pages

### 1. Home Page

Purpose: Make it easy to search available houses and understand what Serenity offers.

Required sections:

- Hero search area with destination, check-in, checkout, guests, pets, and search button.
- Featured houses with nightly price, bedrooms, beds, bathrooms, guests, parking, pet-friendly status, and CTA.
- Highlight that all three houses are beside each other and can be booked separately or together when available.
- Trust/benefit band: whole private houses, self check-in, Wi-Fi, kitchens, laundry, parking, long-stay friendly.
- Corporate and extended-stay section.
- Pet-friendly stays section.
- Guest use cases: family stays, work crews, relocations, insurance accommodation, long stays.
- Footer with phone, email, policies, FAQ, corporate stays, terms, privacy, and contact.

### 2. Property Search Page

Purpose: Let guests compare Serenity houses.

Features:

- Search summary with selected destination, dates, guests, and pets.
- Filters for price, bedrooms, beds, parking, pet-friendly, air conditioning, long-term stays, and corporate suitability.
- Sort by recommended, price low to high, price high to low, bedrooms, and capacity.
- Property cards with image, name, location, price per night, rating/testimonial placeholder, key amenities, and CTA.
- Map or approximate area panel. Exact address should only be shown after booking confirmation.

### 3. Property Detail Page

Purpose: Provide all stay information and start booking.

Required content:

- Airbnb-style image gallery with main photo and supporting photos.
- Title, location, whole-house label, capacity, bedrooms, beds, bathrooms.
- Note that the other Serenity houses are beside this house, making nearby multi-house bookings possible.
- Sticky booking card on desktop and fixed reserve bar on mobile.
- Date picker with unavailable dates disabled.
- Guest selector for adults, children, infants, and pets.
- Live price breakdown.
- House description.
- Sleeping arrangements.
- Amenities list with "show all amenities".
- Availability calendar.
- House rules.
- Pet policy.
- Cancellation policy.
- Approximate location.
- Related houses.

Booking card should show:

- Nightly price.
- Check-in and checkout.
- Guests and pets.
- Price breakdown:
  - nightly price x nights
  - cleaning fee
  - pet fee if applicable
  - extra guest fee if applicable
  - weekly or monthly discount if applicable
  - tax/GST if applicable
  - total AUD
- "Reserve" CTA.
- Message: "You will not be charged until payment is confirmed."

### 4. Booking Review

Purpose: Let guests review the reservation before entering details.

Required content:

- Property summary.
- Dates and nights.
- Guest count.
- Pet count.
- Price breakdown.
- Cancellation policy summary.
- Link to edit dates or guests.
- Continue to guest details CTA.

### 5. Guest Details

Purpose: Collect reservation details before payment.

Guest fields:

- First name.
- Last name.
- Email.
- Phone.
- Country.
- Address.
- City.
- State.
- Postcode.
- Arrival time.
- Purpose of stay.
- Special requests.

Purpose of stay options:

- Holiday.
- Visiting family or friends.
- Business travel.
- Contractor project.
- Employee relocation.
- Temporary housing.
- Other.

Validation:

- Required guest contact fields must be completed.
- Email must be valid.
- Phone must be valid enough for local contact.
- Guest total must not exceed property capacity.
- Dates must pass minimum stay and availability checks.

### 6. Corporate Booking

Purpose: Support bookings where a company is arranging or paying for the stay.

Entry points:

- Corporate CTA on the home page.
- Corporate page.
- Checkbox during guest details: "Is a company paying for this stay?"
- Corporate filter on property search.

Corporate fields:

- Company name.
- Business contact name.
- Business email.
- Business phone.
- Billing address.
- ABN.
- Purchase order number.
- Number of employees staying.
- Employee names if available.
- Project or relocation reason.
- Requested invoice notes.

Corporate booking options:

- Pay immediately by card through Stripe.
- Request invoice/payment link.
- Submit enquiry for long-stay or multi-house booking.
- Request multiple adjacent houses for the same dates when available.

Corporate rules:

- Corporate bookings should still reserve specific dates and a specific property when payment is made immediately.
- Invoice/payment-link bookings should be marked as pending until payment or admin approval.
- Admin should be able to record company details, PO number, notes, and booking status.
- Multi-house corporate bookings should show that the houses are beside each other and suitable for teams that need separate houses in the same location.

### 7. Payment With Stripe

Purpose: Replace mock payment with a production-safe Stripe payment flow.

Recommended implementation:

- Use a server-side endpoint to create a Stripe Checkout Session or Payment Intent.
- Never collect raw card details directly in app code.
- Use Stripe-hosted Checkout or Stripe Payment Element.
- Store Stripe payment IDs against the reservation.
- Confirm reservation only after Stripe confirms successful payment.
- Use Stripe webhooks for reliable payment status updates.

Payment methods:

- Card.
- Apple Pay when available.
- Google Pay when available.
- Link by Stripe if enabled.

Payment options:

- Pay in full now.
- Optional Airbnb-like split payment:
  - deposit due now
  - remaining balance automatically due before check-in
  - only if business rules allow it
- Optional corporate invoice/payment link.

Stripe metadata should include:

- Reservation reference.
- Property slug.
- Property name.
- Check-in date.
- Checkout date.
- Guest name.
- Guest email.
- Corporate booking flag.
- Company name when applicable.

Webhook events to handle:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `checkout.session.expired`

Post-payment behavior:

- Show confirmation page.
- Send guest confirmation email.
- Send internal booking notification.
- Mark dates unavailable.
- Generate reservation reference.
- Include invoice or receipt link when available.

### 8. Confirmation Page

Purpose: Clearly confirm the reservation.

Required content:

- Confirmation status.
- Reservation reference.
- Property name.
- Dates.
- Guests.
- Total paid or payment status.
- Guest name.
- Corporate company name if applicable.
- Next steps.
- House access note: exact address and access instructions are sent closer to check-in or after verification.
- Print/save confirmation action.

## Admin Requirements

There should only be one authenticated user type: the admin. Customers and guests should not need to create an account or log in before booking.

Guest behavior:

- Guests can browse houses without logging in.
- Guests can search availability without logging in.
- Guests can complete booking details without logging in.
- Guests can pay through Stripe without logging in.
- Guests receive booking confirmation by email.
- Guests can contact Serenity for changes or cancellation requests.

Admin behavior:

- Admin must log in to manage the website.
- Admin can view and manage all bookings.
- Admin can manage corporate booking requests.
- Admin can update property content, photos, pricing, fees, rules, and availability.
- Admin can review Stripe payment status and reservation status.

Admin should be able to manage:

- Properties.
- Photos.
- Prices.
- Cleaning fees.
- Pet fees.
- Extra guest fees.
- Minimum stay.
- Weekly and monthly discounts.
- Unavailable dates.
- Bookings.
- Payment status.
- Corporate booking details.
- Guest notes.
- Cancellation/refund status.

## Data Model

Suggested entities:

### Property

- id
- slug
- name
- property type
- location
- short description
- full description
- max guests
- bedrooms
- beds
- bathrooms
- bed arrangements
- amenities
- check-in time
- checkout time
- pet policy
- parking type
- nightly price
- cleaning fee
- pet fee
- extra guest fee
- extra guest threshold
- minimum stay
- weekly discount
- monthly discount
- images
- unavailable dates
- house rules
- latitude
- longitude

### Reservation

- id
- reference
- property id
- check-in
- checkout
- nights
- adults
- children
- infants
- pets
- guest details
- corporate details
- price breakdown
- total
- currency
- status
- stripe checkout session id
- stripe payment intent id
- stripe customer id
- created at
- updated at

### Corporate Details

- company name
- business contact
- business email
- business phone
- billing address
- ABN
- purchase order number
- employees
- invoice notes
- payment method preference

## Booking Statuses

- Draft: guest has started booking but not submitted.
- Pending payment: reservation created but payment incomplete.
- Confirmed: payment succeeded or admin approved invoice booking.
- Pending corporate approval: company booking requires manual review.
- Cancelled: guest/admin cancelled.
- Refunded: refund processed.
- Expired: checkout session or hold expired.

## Central Public Contact Settings

Public contact content is managed from the existing `public.site_settings` row with `key = "site"`. The JSONB value remains a single settings object; administrators edit normal fields in the authenticated Site Settings panel rather than editing JSON directly.

The contact fields are:

- `business_name`
- `contact_email`
- `phone_number`
- `whatsapp_number`
- `public_address`
- `business_hours`
- `contact_page_heading`
- `contact_page_description`
- `footer_text`
- `directions_url`
- `map_url`
- `facebook_url`, `instagram_url`, `linkedin_url`
- `booking_enquiry_email`, `corporate_enquiry_email`
- `contact_published`, `public_address_visible`

The public layout loads this record server-side and provides typed contact settings to the footer, contact page, corporate prompts, and location page. If Supabase is unavailable, or contact publishing is disabled, the app uses safe defaults. When `public_address_visible` is false, public pages show only the privacy-safe location message and do not expose the configured address.

## Admin Workspace Design

The authenticated `/admin` route uses `SupabaseAdminDashboardV2` and keeps the existing tabs and Supabase operations intact: overview, Homepage CMS, houses and galleries, reviews, bookings, calendar sync, corporate enquiries, admin users, and Site Settings. Navigation is grouped into Workspace, Content, Operations, and Administration. The sidebar collapses on desktop and becomes a keyboard-usable drawer with a backdrop on mobile.

The admin theme preference is stored locally under `serenity-admin-theme` and cycles through light, dark, and night modes. All three modes use the same monochrome controls and readable contrast, with colour reserved for success and error feedback. Australian defaults remain `en-AU`, `AUD`, `Australia/Melbourne`, and `DD/MM/YYYY`.

## Availability Rules

- Checkout date must be after check-in date.
- Check-in cannot be in the past.
- Minimum stay applies per property.
- Unavailable dates cannot be selected.
- Guest count cannot exceed property capacity, excluding infants.
- Dates should be held temporarily during payment to avoid double booking.
- If payment fails or expires, release the held dates.

## Pricing Rules

- Base nightly subtotal = nightly price x nights.
- Cleaning fee applies once per booking.
- Pet fee applies when pets are added.
- Extra guest fee applies per extra guest per night after the property threshold.
- Weekly discount applies for stays of 7+ nights.
- Monthly discount applies for stays of 28+ nights.
- GST/tax should be displayed according to Australian business requirements.
- All prices should be shown in AUD.

## Policies Needed Before Launch

- Cancellation policy.
- Refund policy.
- Pet policy.
- Damage policy.
- Security deposit or pre-authorisation rules if required.
- Check-in and checkout rules.
- Privacy policy.
- Terms and conditions.
- Corporate invoicing/payment terms.

## SEO Requirements

Target searches:

- Furnished houses Pakenham.
- Short stay houses Pakenham.
- Corporate accommodation Pakenham.
- Contractor accommodation Pakenham.
- Relocation accommodation Pakenham.
- Pet-friendly furnished houses Pakenham.
- Long-term furnished houses Victoria.

Structured data:

- Use VacationRental schema on property detail pages.
- Include property name, occupancy, location, image, amenities, and price range where appropriate.

## Launch Checklist

- Replace placeholder images with real property photos.
- Connect live Stripe account.
- Add server-side booking persistence.
- Add Stripe webhooks.
- Add email notifications.
- Add admin booking management.
- Add production cancellation/refund policies.
- Confirm GST/tax handling with accountant or business owner.
- Test booking on desktop and mobile.
- Test failed payment, expired payment, refund, and corporate booking paths.
- Ensure exact addresses are hidden until reservation confirmation.

## Property CMS and Photo Manager

The admin dashboard now manages house content through the existing Supabase
property records and includes a dedicated photo manager for Serenity 7, 9, and
11. Property edits remain normal form fields; the editor does not require JSON
editing. The additive migration
`supabase/migrations/0010_property_content_and_photo_manager.sql` adds the
guest-facing property detail fields, photo metadata, and per-category state.

Photo uploads use `/api/admin/upload-url` only to create a signed upload URL;
the browser sends the optimized WebP bytes directly to the `property-images`
Supabase Storage bucket. Browser and server validation enforce JPG, JPEG, PNG,
WebP, or AVIF images at no more than 5 MB per file. The admin UI supports
multi-file upload progress, previews, alt text, category selection, drag/drop
ordering, cover selection, visibility, delete confirmation, category
descriptions, and “No photo available” states.

Public property and gallery loaders only return published, visible,
non-placeholder photos whose source is an uploaded local/Supabase asset.
Existing third-party preview rows are retained for admin review but are not
rendered publicly. If a house or category has no approved uploaded photo, the
site shows a calm no-photo state and never renders a broken or empty image.

To apply the schema to Supabase after linking the project:

```text
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Replace `YOUR_PROJECT_REF` with the project ref from the Supabase dashboard;
do not use the project URL or commit credentials. The migration is additive
and preserves existing properties, bookings, pricing, publish state, and
image records.

### Current gallery architecture

The admin photo manager is embedded in the Houses editor; there is no separate
Images sidebar item. Each house owns its own editable category list through
`property_photo_categories`, so categories can be added, renamed, reordered,
hidden, or removed without imposing the same room list on every house. The
manager supports up to five uploaded photos per category, cover selection,
photo ordering, visibility, preview-image identification, and an unsaved-change
warning before the editor is left.

The public `/gallery` page begins with `GalleryImmersiveIntro`, a cinematic
`Serenity On The Rocks` opening built from the approved cover photo for each
published house. As the guest scrolls, the covers crossfade and scale into an
editorial introduction, followed by moving chapter typography and a reduced-
motion-safe handoff into the collection. The intro does not own separate image
records or hard-coded house facts; it derives them from the same public loader.

`GalleryCinematicJourney` continues the same full-page motion language through
the complete gallery. The previous house selector, summary panel, category bar,
horizontal card stages, filters, and collection grid are not rendered. Instead,
each published house receives a full-screen scroll chapter, followed by an
interior chapter generated from that house's published Supabase categories and
photo ordering. Category photos crossfade within sticky room scenes and open in
a keyboard-accessible lightbox. The final booking chapter links back to the
existing house and contact flows. External preview/mock rows remain filtered,
and a no-photo state appears when no approved upload is available.

## Promotions and Voucher Booking

Promotions are managed from the authenticated admin workspace under
`Promotions`. The normal form fields cover the campaign name, badge and
desktop/mobile copy, unique case-insensitive voucher code, percentage or fixed
AUD discount, Melbourne start/end dates, successful-redemption cap,
minimum booking amount and nights, applicable houses, corporate eligibility,
stacking, refund restoration, active/published state, and header visibility.
The list exposes DRAFT, SCHEDULED, ACTIVE, EXPIRED, SOLD OUT, and DISABLED
states, plus successful and remaining redemption counts. The admin preview
uses the same sharp rectangular presentation as the public header.

`supabase/migrations/0014_promotions.sql` is additive. It creates
`promotions` and `promotion_redemptions`, adds promotion metadata to
`bookings`, and provides service-role-only RPCs for reserving, confirming,
releasing, and optionally restoring redemption capacity. A pending checkout
reserves a slot without counting it as successful; a paid Stripe checkout
confirms it; failed, cancelled, and expired checkouts release it. Database row
locks protect the final capacity check during concurrent payments. Refunds
restore capacity only when the promotion’s explicit “restore capacity after
refund” option is enabled.

The public header loads the current active published promotion centrally and
falls back to the legacy `site_settings` promo fields for older deployments.
Booking review and payment accept a voucher code for preview, but the final
server booking route re-loads the promotion, re-checks dates, house,
corporate rules, minimums, stacking, dates, and capacity, then creates the
Stripe amount and metadata. Stripe webhook retries are idempotent and confirm
the redemption only after payment succeeds.

Promotion dates are stored as UTC timestamps and entered/displayed in
`Australia/Melbourne`; guest pricing remains in AUD. Apply migration 0014 with
the normal Supabase migration workflow before publishing promotions.

## Calendar synchronization and dated pricing hardening

The admin Calendar Sync workspace supports Serenity 7, Serenity 9, and
Serenity 11 independently. Each house has a hashed-token Serenity export and
server-side Airbnb, Vrbo, and Stayz imports. Imports are keyed by external UID,
updated in place, cancelled or stale records stop blocking, and provider-safe
export links omit the provider's own imported events to reduce calendar loops.
No guest personal or payment data is written to iCal.

`vercel.json` schedules the protected sync endpoint every 15 minutes. External
platform refresh timing remains outside Serenity's control, so booking creation
always rechecks active bookings and calendar blocks on the server and relies on
PostgreSQL conflict protection for the final insert.

Migration `0015_calendar_sync_hardening.sql` is additive. It adds explicit sync
attempt/frequency/count fields, admin-only manual-block reasons and notes, and
active/inactive dated rates. Dated-rate saves use conflict-key upserts instead
of deleting all rates. Each booking stores its night-by-night AUD rates in
`price_breakdown`; Stripe Checkout uses the same server-calculated total and
receives concise property, stay, availability-check, and price metadata.

See `CALENDAR_SYNC_SETUP.md` for the admin setup, official marketplace paths,
refresh limitations, privacy rules, test workflow, and troubleshooting.
