# Admin redesign — implementation and verification

Completed locally on 6 September 2026. No deployment or production mutations were performed.

## Implementation checklist

- [x] Read the installed Next.js 16.3 guides and trace active admin routes.
- [x] Replace the admin CSS with scoped neutral light/dark tokens and reusable controls, cards, notices, badges and responsive tables.
- [x] Preserve public CSS declarations and original colors inside guest content previews.
- [x] Rebuild navigation, collapsed sidebar, profile actions, mobile modal drawer and visible theme switch.
- [x] Extract overview, homepage, house editor, settings, inbox/team sections and shared fields from the active dashboard.
- [x] Migrate all eleven sections: Overview, Homepage, Houses, Reviews, Promotions, Bookings, Calendar, Enquiries, Contacts, Users and Settings.
- [x] Migrate house creation/detail routes, booking drawers, hero/gallery uploads and authentication screens.
- [x] Add explicit domain status mappings with safe unknown values and distinct booking/payment/category/source semantics.
- [x] Use native modal dialogs with inert backgrounds, Escape, focus containment/restoration and shared destructive confirmations.
- [x] Protect dirty house, homepage and settings drafts, including internal navigation and page departure; retain drafts during data refreshes.
- [x] Load list data in complete, stably ordered pages; surface loading failures and retries instead of silently incomplete lists.
- [x] Preserve Supabase authentication, API contracts and server-enforced super_admin user management.

## Confirmed defects fixed

- Late theme initialization, unsafe browser storage and legacy night preference handling.
- Deep-linked house editor initialization and new-house guest-limit validation using the wrong field.
- Removed dated prices not being deleted from storage.
- Inaccurate homepage section dirty state and editor data being replaced during unrelated refreshes.
- Missing dialog keyboard behavior, mobile profile/close labels and save errors hidden behind drawers.
- Incomplete list reads, silent data failures, and promotion retries retaining an obsolete error.

## Verification

- `npx tsc --noEmit --incremental false`: passed.
- Targeted ESLint on all changed application TypeScript files and extracted components: passed, no warnings.
- `npm run build`: passed, including all admin/API routes.
- Existing calendar (7), reservations (4), promotions (4), plus admin pagination/status regression tests (4): all 19 passed.
- Public stylesheet comparison: all 2,306 non-admin rules retain the same selectors (apart from a zero-specificity admin exclusion) and declarations.
- Browser inspected all eleven sections at 390, 768 and 1440px in both themes using isolated synthetic data. No page-level horizontal overflow found.
- Checked homepage nested sections, existing/new house forms, settings/house/homepage dirty warnings, restoration of unchanged values, booking pagination, profile menu, collapsed sidebar and mobile navigation.
- Checked native booking/manual drawers and confirmation dialogs, Escape and focus restoration. A synthetic rejected booking save remained in the drawer with an inline error.
- Real Next.js login and reset screens checked at all three widths in both themes. Theme persisted across reloads. Missing/expired recovery link displays a disabled submit and recovery guidance. No console errors or hydration warnings observed on these screens.
- Representative browser screenshots were displayed in the task.

## Access limits

The browser had no authenticated admin session. Protected components were checked with synthetic records through a separate loopback preview; production authorization was not bypassed. Successful real uploads, persisted CMS saves/publishing, role changes, booking/payment changes, calendar sync and authenticated Next.js back/forward transitions were not exercised. A successful password recovery/sign-in was not attempted. Browser layout checks are not a full screen-reader or WCAG certification.

## Reproduce the isolated preview

Run `npm run dev` and open `/admin/login` once to generate development CSS, then run `node scripts/admin-qa/preview.cjs`. Open `http://127.0.0.1:4107/admin`. The fixture bundles the real active components with a separate synthetic data adapter; it does not load environment credentials and rejects all non-GET requests. It is not a Next.js route and does not test server authorization. Stop it with Ctrl+C.

Run the added regression tests with `node --experimental-strip-types --test scripts/admin-ui.test.mts`.
