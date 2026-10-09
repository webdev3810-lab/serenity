# Stripe payment setup (local first)

The app uses Stripe-hosted Checkout. Guests pay in **AUD**; checkout explicitly disables adaptive currency conversion. Amounts sent to Stripe are in cents. No card numbers, raw webhook payloads, or Stripe secrets are stored in the app database.

## Before you accept live payments

1. Review and apply `supabase/migrations/0023_stripe_payment_events.sql` to the linked Supabase project. This creates the private webhook journal and idempotent claim function. **This change has not been pushed to Supabase.**
2. In the server environment, set `STRIPE_SECRET_KEY` to your account's `sk_live_...` secret. The existing local `.env.local` still has its test key; replace it only when you are ready to run locally against live Stripe. Never put a secret key in a `NEXT_PUBLIC_` variable.
3. In Stripe Workbench, create a **live-mode** webhook endpoint at `https://www.serenityhomesdirect.com/api/stripe/webhook`. Subscribe to: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, and `charge.refunded`.
4. Copy that endpoint's `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET` in the deployment's server environment. Local Stripe CLI forwarding uses a **different** `whsec_...` secret. Keep test and live modes paired with their corresponding keys.
5. Set `NEXT_PUBLIC_SITE_URL=https://www.serenityhomesdirect.com` in deployment so checkout return URLs use the canonical domain. Deploy only after the migration and keys are ready.

Stripe Checkout here is created on the server, so `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not used by this flow. The Admin → Payments page reports which mode the server key is in and whether a webhook secret is configured, but never reveals either key.

## Local test

Keep a `sk_test_...` key in `.env.local`, run the app, and forward test events with the Stripe CLI:

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Paste the CLI's temporary `whsec_...` into the empty `STRIPE_WEBHOOK_SECRET` entry in `.env.local`, then restart the app. Make a **test** booking using a Stripe test card. Inspect Admin → Payments for the checkout, AUD amount, payment status, webhook outcome and delivery status. Test a declined attempt followed by a successful card to confirm the booking stays open while the guest retries. A refund test should distinguish partial from full refunds.

The journal stores only event IDs, references, amounts, outcomes, safe failure messages and processing errors. Duplicate webhook deliveries are claimed once; failed processing returns a server error so Stripe can retry. The page lists the latest 100 Stripe checkouts and verified events, with a manual refresh and a 30-second refresh while open. For the complete historical ledger, use the Stripe Dashboard.

**Do not treat the local admin monitor as a substitute for Stripe's payout, tax, dispute or reconciliation reports.** It shows booking-level state and verified event deliveries, not all Stripe account activity.
