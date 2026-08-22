# Serenity calendar synchronization

Serenity supports one-way iCal imports from Airbnb, Vrbo, and Stayz and a secure Serenity iCal export for sending direct Serenity bookings back to those platforms. The sync is intentionally iCal-only: no marketplace API keys or guest details are stored.

## Supabase setup

Apply the additive migration after linking the project:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

`0009_calendar_sync.sql` creates `calendar_connections` and `calendar_events`, admin-only RLS policies, indexes, and a database trigger that prevents a new active booking from overlapping an imported calendar block. It does not delete or alter existing booking data.

The app uses the service-role key only inside server routes and the scheduled sync job. Never add `SUPABASE_SERVICE_ROLE_KEY` to a `NEXT_PUBLIC_` variable.

## Configure a property

1. Sign in to `/admin` and open **Calendar sync**.
2. For each house, paste the private iCal export URL from Airbnb, Vrbo, or Stayz and select **Save feed**.
3. Select **Sync property** to test the feed immediately. The admin view reports the last attempt, active imported blocks, feed errors, and booking conflicts.
4. Select **Generate link** under **Serenity export link**, copy the one-time URL, and paste it into the calendar-import field on each marketplace.
5. If the URL is exposed, use **Regenerate link**. The previous token is replaced and cannot be recovered from the database because only its SHA-256 hash is stored.

Use **Serenity blocked dates** in the same admin section for maintenance, preparation, or other unavailable periods. These blocks are stored as non-guest calendar events, block public availability, and are included in the Serenity export.

The export feed contains only generic `Reserved` or `Unavailable` blocks. It does not include guest names, emails, prices, payment details, or notes. The optional `source` query parameter can be appended when a provider should not receive its own imported events, for example `&source=airbnb`.

## Scheduling

`vercel.json` schedules `/api/cron/calendar-sync` every 15 minutes. Add the same long random value to the Vercel environment as `CRON_SECRET`. The endpoint requires `Authorization: Bearer <CRON_SECRET>` and returns `401` without it. If the project is not deployed on Vercel, run the same endpoint from a trusted scheduler or use the admin **Sync all calendars** button.

## Sync behavior and safety

- Feed downloads happen server-side with HTTPS-only URL validation, a 10-second timeout, and a 2 MB response limit.
- The parser accepts all-day and date-time `VEVENT` records, honours `DTEND` as the exclusive checkout date, and ignores cancelled/transparent events as blocking dates.
- Imported events are upserted by property, platform, and external UID. Events missing from a later feed are marked stale and stop blocking availability.
- Public availability includes active imported events. New direct and corporate bookings are checked before insertion, and the database trigger provides the final conflict guard.
- Existing booking-to-booking overlap protection remains unchanged.
- Reduced or missing external feeds fail independently per property/platform and keep the last error in the admin dashboard.

Marketplace calendar URLs are private credentials. Treat them like passwords, rotate them if exposed, and do not paste them into support tickets or commit them to source control.
