# Serenity calendar synchronization

Serenity uses private iCal feeds to exchange blocked dates with Airbnb, Vrbo, and Stayz for Serenity 7, Serenity 9, and Serenity 11. It does not scrape marketplace pages and it does not need marketplace passwords.

iCal is not instant. When the GitHub Actions scheduler below is configured, Serenity requests enabled import feeds roughly every 15 minutes. Airbnb documents an automatic import refresh of about three hours. Always leave the final server-side availability check enabled.

## Apply the additive Supabase migrations

After linking the correct Supabase project, apply the migrations in order:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

- `0009_calendar_sync.sql` creates the connection/event tables and booking conflict trigger.
- `0015_calendar_sync_hardening.sql` adds attempt/count/frequency status, private manual-block notes and reasons, and active/inactive dated pricing.
- The migrations do not delete bookings, calendar events, prices, photos, or property records.

The service-role key is used only by server routes. Never expose `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable.

## Quick admin setup

1. Sign in to `/admin` and open **Calendar sync**.
2. Select Serenity 7, 9, or 11 in the guided setup.
3. Generate and copy that house's secure Serenity calendar URL.
4. Paste the provider-safe Serenity URL into Airbnb.
5. Copy Airbnb's private export URL and paste it into the matching Airbnb card in Serenity (for example, the Serenity 11 card for the Serenity 11 listing).
6. Select **Test connection**, then **Save connection**. Saving now runs the first import immediately.
   If you previously uploaded a one-time `.ics` file for this house, use **Clear old file dates** after the live feed is connected so its old dates no longer block availability.
7. Repeat for Vrbo and Stayz.
8. Test one externally blocked night in Serenity's public calendar.
9. Create a temporary direct booking and confirm it appears in the secure Serenity `.ics` feed.
10. Add and remove a manual block.
11. Add a dated nightly price and verify the calendar, booking review, and Stripe AUD total.

## Airbnb setup

Use Airbnb's official guide: <https://www.airbnb.com/help/article/99>

1. Open the Airbnb Host Calendar and select the correct Serenity listing.
2. Open **Availability**.
3. Under **Connect calendars**, select **Connect to another website**.
4. Import the provider-safe Serenity `.ics` URL shown in the Airbnb card.
5. Copy Airbnb's export calendar link. It should be a private calendar URL ending in `.ics`.
6. Paste it into the same property's Airbnb import field in Serenity.
7. Test and save; the first import runs immediately.

## Vrbo / Stayz setup

Use Vrbo's official guide: <https://help.vrbo.com/articles/How-do-I-import-my-iCal-or-Google-calendar>

1. Open the Vrbo or Stayz Owner Dashboard and select the correct property.
2. Open **Calendar**.
3. Open **Settings → Availability → Calendar sync → Connect calendars**.
4. Import the provider-safe Serenity `.ics` URL.
5. Export the Vrbo/Stayz reservation calendar and copy its private URL.
6. Paste it into the same property's Vrbo or Stayz import field in Serenity.
7. Test and save; the first import runs immediately.

If a provider gives a `webcal://` link, Serenity safely normalizes it to HTTPS. Vrbo's own interface may require you to change `webcal://` to `https://` before importing.

## Connection states

- **Not configured**: no import URL is saved.
- **Waiting for first sync**: the URL is saved and ready.
- **Connected**: the last sync completed.
- **No events found**: the URL is a valid calendar but currently contains no events.
- **Invalid URL**: the URL is a webpage, private-network address, or does not return iCal content.
- **Sync failed**: the remote server could not be reached or returned an error.
- **Conflict**: an imported block overlaps an existing Serenity booking. The existing booking is kept unchanged.
- **Disabled**: the connection and its imported blocks are paused without clearing the saved URL.

The admin shows last attempt, last success, sync frequency, blocked-night count, and the last error. Use **Enable**, **Disable**, **Disconnect**, or **Regenerate secure URL** as needed.

## Manual blocks

In a property's **Manual availability blocks** section:

1. Enter start and end dates in Melbourne local dates. The end date is exclusive, like checkout.
2. Choose maintenance, owner use, cleaning, preparation, renovation, private booking, or other.
3. Add an optional internal note.
4. Save the block.

Manual blocks appear in the monthly source calendar, block public availability, and are included in marketplace exports. Internal notes are admin-only and never appear in iCal. Use **Edit** to change a block or **Remove** and confirm to release it. A manual block cannot be saved over an existing Serenity booking.

## Dated nightly prices

Open the selected house's **Booking rules → Dated nightly prices** section:

1. Choose one date.
2. Enter the nightly AUD rate.
3. Add an optional label such as Christmas rate or event rate.
4. Add or update the rate, then save or publish the house.
5. Toggle a saved rate inactive to preserve it without applying it.

Dates are displayed as `DD/MM/YYYY` and interpreted in `Australia/Melbourne`. Each stay night is calculated separately. Active overrides replace the ordinary nightly rate for that date in the public calendar, booking review, stored price breakdown, and server-created Stripe Checkout amount. Inactive or missing overrides fall back to the house's normal rate.

## Export privacy and loop prevention

The secure feed includes date ranges for active Serenity bookings, corporate bookings, manual blocks, maintenance, cleaning, preparation, and other imported blocks. It uses stable event IDs and generic summaries only.

It never includes guest names, emails, telephone numbers, prices, payment details, or private notes. Only the SHA-256 hash of the export token is stored in Supabase. Regenerating a link immediately revokes the old token.

Provider-safe URLs append `source=airbnb`, `source=vrbo`, or `source=stayz`, which prevents Serenity from echoing a platform's own imported event back to that same platform.

## Scheduler

Supabase Cron calls `/api/cron/calendar-sync` every 15 minutes, on the quarter hour. Migration `0022_supabase_calendar_cron.sql` installs `pg_cron` and `pg_net` and creates the job **inactive** so a fresh deployment cannot call an unprotected or unconfigured endpoint.

1. In Vercel project **Settings → Environment Variables**, add a long random `CRON_SECRET` (at least 32 characters) for Production and redeploy the production site. Never use a public `NEXT_PUBLIC_` variable for this secret.
2. In Supabase **Vault**, add the **same value** under the name `calendar_sync_cron_secret`. Do not put its value in a migration, SQL snippet, repository secret, or chat message.
3. Confirm the protected endpoint returns 401 without the secret and 200 with the secret. A 500 response means the calendar import itself failed and should be investigated before activation.
4. Activate the Supabase job in **Integrations → Cron → Jobs**, or run `select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'serenity-calendar-sync'), active := true);` in the Supabase SQL Editor.
5. Check the job's run history and each connection's `last_synced_at` in admin after the next quarter hour. Supabase `pg_net` queues HTTP requests asynchronously, so a successful Cron SQL run alone does not prove the HTTP endpoint succeeded; inspect `net._http_response` or the admin sync status if dates do not update.

The GitHub Actions workflow remains available for **manual** emergency runs only. To use it, set `CALENDAR_CRON_SECRET` and `CALENDAR_SYNC_URL` in GitHub Actions secrets, then choose **Sync external calendars → Run workflow**. Do not enable its schedule alongside Supabase Cron. The admin **Sync now** button also remains available.

## Troubleshooting

- **Listing webpage rejected**: copy the platform's private export/iCal link, not the public listing URL.
- **Invalid calendar content**: open the provider's calendar export controls again; the URL must return `VCALENDAR` data rather than HTML.
- **No events found**: this is valid when the external calendar has no reservations or blocks. Add a temporary test block and sync again.
- **Sync failed**: verify the private link has not expired, test it in admin, and regenerate it at the provider if necessary.
- **Reconnect**: disconnect the import, obtain a fresh provider URL, paste it, test, save, and sync.
- **Conflict**: compare the source and date range in admin. Do not cancel the existing Serenity booking automatically; resolve the external platform manually.
- **External update not visible yet**: use **Sync now** for Serenity, then allow for the external provider's own refresh interval.

Treat every external iCal URL like a password. Do not commit it, expose it in public pages, or paste it into public support tickets.
