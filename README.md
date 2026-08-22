Serenity Stays is a Next.js direct-booking website for furnished houses in Pakenham, Victoria. The existing UI uses Australian formatting (`en-AU`, `AUD`, and `Australia/Melbourne`) and can run with local fallback data while Supabase is being configured.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Supabase setup

Copy `.env.example` to `.env.local` and add the Supabase project values. The public website intentionally starts in local preview mode:

```bash
CONTENT_SOURCE=local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The public homepage, house listing, house detail pages, related houses, and booking preview use the complete local library in `src/data/properties.ts` while `CONTENT_SOURCE=local`. This keeps the preview populated even when Supabase is configured but has no published content. After the database has been populated, change `CONTENT_SOURCE=supabase`; the public pages are server-rendered dynamically so the source can be switched through runtime environment configuration without changing the frontend code.

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never use it in a client component or expose it through a `NEXT_PUBLIC_*` variable.

Run the database migration and seed in the Supabase SQL Editor, or with the Supabase CLI:

```bash
# No global CLI is required; this works on Windows with Node.js 20+.
npx supabase@latest --version
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest db push
npx supabase@latest db reset
```

The repository includes `supabase/config.toml` with a `YOUR_PROJECT_REF` placeholder. Replace it with the project ref from Supabase, or let `npx supabase@latest link --project-ref YOUR_PROJECT_REF` write the linked project locally. The official npm-based CLI requires Node.js 20 or later; a global `npm install -g supabase` is not supported. If you prefer a global command on Windows, install the official Scoop package and then use `supabase login`, `supabase link`, and `supabase db push`. Do not put a service-role key in this file or in a `NEXT_PUBLIC_*` environment variable.

The migrations create the properties, images, amenities, bookings, enquiries, homepage content, site settings, admin users, indexes, RLS policies, role checks, the public `property-images` Storage bucket, and the `hero-media` bucket plus `homepage_hero_media` table. The hero media table allows a maximum of five ordered active/inactive image or video items. Images are limited to 5 MB and JPG/JPEG/PNG/WebP/AVIF; videos are limited to 20 MB and MP4/WebM. Use `supabase db push` after reviewing migration `0007_homepage_hero_media.sql`.

## Create the first admin

1. Complete the migrations and set the Supabase environment variables.
2. Visit `/admin/login` and choose **Create first admin account** while no row exists in `admin_users`.
3. The server creates the Supabase Auth user and atomically claims the first `admin_users` row as `super_admin`.
4. After the first row exists, public first-account registration is permanently hidden.

For an existing project that already has an Auth user, you can still bootstrap manually with this SQL:

```sql
insert into public.admin_users (user_id, email, role)
values ('AUTH_USER_UUID', 'admin@example.com', 'super_admin')
on conflict (user_id) do nothing;
```

Only authenticated users with an active row in `admin_users` can access `/admin`. The `super_admin` role is required for the Admin users tab. Super admins can invite users, assign `admin`, `editor`, or `super_admin`, activate/deactivate accounts, and remove users. The final super admin cannot be deactivated, demoted, or removed.

The login page includes a generic password-recovery flow. It does not confirm whether a specific email exists. Add `/admin/reset-password` to Supabase Authentication URL Configuration if your project restricts redirect URLs.

The CMS supports house editing, publishing, featured ordering, homepage hero content, corporate enquiries, property image management, and a dedicated hero media editor. Hero media is checked in the browser and again by the upload URL and completion routes. The browser uploads directly to Supabase Storage through a signed upload URL; large media is never sent through a Next.js or Vercel route. The completion route verifies the stored object metadata before writing the database record, and deletes are performed in both Storage and the database.

The admin dashboard also includes a **Calendar sync** section for importing private Airbnb, Vrbo, and Stayz iCal feeds and generating secure Serenity export links. See [CALENDAR_SYNC_SETUP.md](./CALENDAR_SYNC_SETUP.md) for the migration, Vercel cron, token, and conflict-protection setup.

When Supabase environment variables are not present, the public pages use the existing local property fixtures so the design remains previewable. Once Supabase is configured and seeded, published property and homepage content is loaded from Supabase.

The app uses local system font fallbacks so Vercel builds do not depend on a Google Fonts network request.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
