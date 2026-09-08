# Property experience implementation and verification

Implemented locally on 6 September 2026. Earlier admin redesign work and unrelated changes were retained. Nothing was deployed, published, or charged for testing; the required database migrations were applied separately to the linked Supabase project.

## Implementation

- Admin initialization uses `next/script` with `beforeInteractive` in `app/layout.tsx`, as required by the installed Next.js 16.3 documentation. It updates an admin-only CSSOM rule before hydration. The uninitialized admin is hidden until its palette is selected, so it cannot paint the wrong palette. React-owned attributes and style text are not mutated; no hydration-warning suppression is used. The provider retains the workspace provider, storage preference, legacy `night` migration, system-change subscription, cross-tab updates, and an in-memory preference when storage fails.
- House editing includes default nightly pricing and a calendar with inclusive single/range rate overrides, labels, effective nightly prices, markers, reset, month navigation and property selection. Apply changes to the house draft, then use **Save changes**. Reset removes the override. Changing the default leaves explicit rates intact. Availability blocking remains separate.
- Shared amenity identifiers, groups and an allowlisted Lucide icon map serve both admin and public views. Existing labels, including unmatched custom entries, are retained. The editor supports keyboard search, custom icons, removal and ordering. Existing amenity row IDs are retained on save; upserts precede deletion of removed labels. A metadata-schema preflight stops the house save before any write when migration 0019 is unavailable.
- Existing `bed_arrangements` JSON now optionally carries structured bed types/quantities, room kind, photo and description. Legacy text is not parsed into guessed bed types. Bedroom/bed totals derive from rooms only when every room has structured beds and an explicit room kind; otherwise the existing summary remains authoritative.
- House rules, arrival/departure, safety information and cancellation use existing fields. Only configured information appears publicly.
- Actual published review scores drive the overall average and 5-to-1 distribution. Optional category scores are validated on client, API and database. Missing categories do not contribute to averages. Existing reviews need no category values. There are no new verification claims.
- The reusable public template covers all three homes: gallery/photo tour, summary, practical details, rooms, grouped amenities, availability, reviews, location, policies, desktop booking and mobile booking. Native dialogs provide focus containment, Escape dismissal and return focus, including nested photo and booking dialogs. Public colors and typography remain distinct from admin themes. VacationRental structured data is rendered by the server.

## Pricing and guest data flow

`properties.nightly_price` and `property_date_prices` → public Supabase mapping → shared `getNightlyPrice` / `calculatePrice` → public calendar, booking card, quotation and server booking validation. Rate/review reads are paginated. A configured Supabase pricing failure throws rather than silently quoting bundled preview rates; explicit local preview behavior remains available.

Calendar rate boundaries are **inclusive nights**. Booking checkout is **exclusive**. Dates use calendar-date strings and UTC day arithmetic, with Melbourne's current date as the booking reference. A blocked arrival night can still be a departing guest's valid checkout. An incomplete saved check-in in the past no longer prevents choosing new dates.

Existing financial semantics remain: adults + children count toward capacity; infants have their own limit and incur no extra-guest fee. Extra-guest charges equal guests above the included threshold × fee × nights. Pet and cleaning fees are once per stay. Weekly/monthly/corporate discounts continue to apply to accommodation; the existing rounded 10% tax calculation remains. Currency formatting now retains configured cents.

Standard, corporate and admin booking paths use the shared property/price validation. Corporate enquiry conversion now checks current guest capacity. Booking creation stores its quote and total before Stripe checkout; existing confirmed booking records and payment/refund handlers are unchanged. Rate edits do not issue updates to confirmed bookings.

## Migration

The project-local Supabase CLI is installed at version `2.116.0`, authenticated through the existing secure account credential, and linked to project `goobbsmkluehjzfzzyvi`. Migrations `0018_remove_homepage_intro_section.sql` and `0019_property_experience.sql` were applied on 7 September 2026; migration history records both versions. Future changes can use `npx supabase db push` from the repository root.

Migration 0018 removes the obsolete homepage intro constraints and keys. Migration 0019 adds nullable amenity metadata and an optional review-category JSON object with an empty default, replaces the five-star-only review constraint with a 1–5 constraint, and validates the six allowed category keys. Existing labels, rooms, review scores and booking amounts are not rewritten. Authentication, authorization and RLS policies are unchanged. SQL execution was verified through the linked CLI.

## Verification

- `npx tsc --noEmit --incremental false`: passed.
- `npm run build`: passed, including production TypeScript and route generation.
- Targeted ESLint over changed application files: passed. Full `npm run lint` still reports one pre-existing error at `src/components/homepage/ScrollWipeCard.tsx:25` and nine warnings in unchanged components. That file has no diff.
- 36 passing tests: 17 property-experience tests, 7 calendar tests, 4 promotion tests, 4 reservation tests, 4 admin tests. Run the new suite with `npm run test:property`. Existing suites emit their existing Node module-type warning.
- Pricing tests cover defaults, single-date edit/reset, Christmas 24–26, mixed rates, changing defaults, zero/inactive rates, checkout exclusion, Australian DST boundaries, fees, discounts, tax and guest limits. Other tests cover legacy/structured rooms, amenity metadata, review aggregates/validation, explicit/system/legacy/storage-failure theme initialization and currency cents.
- Browser inspection: real Serenity 7/9/11 pages and client navigation; public layouts at 390, 768 and 1440 pixels; gallery and nested lightbox navigation/Escape; grouped amenities and focus return; mobile guest limits; three-night live quote ($720 accommodation + $120 cleaning + $84 GST = $924); configured house rules; clean console on a fresh public navigation session.
- Real `/admin` correctly required authentication. Login/reset pages retained light and dark themes on reload and dark mode across the reset-to-login client navigation, with no console warnings or errors.
- Isolated admin fixture: both themes at 390/768/1440 pixels; Christmas range application, changing $240 default to $275 while preserving $350 overrides, resetting those overrides, structured king-bed quantity, keyboard Wi-Fi selection, legacy review categories left blank, category editing and retained draft/error after a deliberately rejected fixture save.
- A synthetic public review fixture verified a 3.83 overall average, a mixed distribution, category averages excluding missing values, and all-review search returning the matching sixth review. Synthetic data is isolated from Next routes and production data.

Authenticated persistence, real storage uploads and payment checkout were not exercised. Database migration execution and CLI synchronization were verified on the linked Supabase project. The fixture rejects every non-GET request. The screenshot referenced in the request was not present in the attachment; the review layout follows the written specification instead.

For repeatable local UI checks, start the normal development server and run `node scripts/admin-qa/preview.cjs`. The loopback-only fixture serves `/admin/houses/fixture-7`, `/admin?tab=reviews` and `/reviews-preview` on port 4107.
