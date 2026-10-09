import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const supabase = createSupabaseAdminClient();
  const [eventsResult, bookingsResult] = await Promise.all([
    supabase.from("stripe_payment_events")
      .select("stripe_event_id, event_type, processing_status, booking_reference, stripe_checkout_session_id, stripe_payment_intent_id, amount_cents, currency, outcome, failure_code, failure_message, last_error, livemode, event_created_at, attempts")
      .order("event_created_at", { ascending: false }).limit(100),
    supabase.from("bookings")
      .select("id, reference, total, currency, payment_status, booking_status, stripe_checkout_session_id, stripe_payment_intent_id, created_at")
      .not("stripe_checkout_session_id", "is", null)
      .order("created_at", { ascending: false }).limit(100),
  ]);
  if (eventsResult.error || bookingsResult.error) {
    console.error("Payment monitor data could not load", eventsResult.error ?? bookingsResult.error);
    return NextResponse.json({ error: "Payment monitor is unavailable. Apply the latest Supabase migration before using it." }, { status: 503 });
  }
  return NextResponse.json({
    mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "test" : "not configured",
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    currency: "AUD",
    events: eventsResult.data ?? [],
    bookings: bookingsResult.data ?? [],
  }, { headers: { "Cache-Control": "private, no-store" } });
}
