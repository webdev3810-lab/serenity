import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { fetchAllAdminRows } from "@/src/lib/admin-pagination";
import { receiptCode } from "@/src/lib/paymentReceipt";

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const mode = key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "live"
    : key.startsWith("sk_test_") || key.startsWith("rk_test_") ? "test" : "not configured";
  if (mode === "not configured") return NextResponse.json({ receipts: [], mode }, { headers: { "Cache-Control": "private, no-store" } });
  const supabase = createSupabaseAdminClient();
  const [bookingsResult, propertiesResult, eventsResult] = await Promise.all([
    fetchAllAdminRows(() => supabase.from("bookings")
      .select("id, reference, group_reference, property_id, guest_details, check_in, checkout, total, currency, booking_type, booking_status, stripe_checkout_session_id, stripe_payment_intent_id, updated_at")
      .eq("payment_status", "paid")
      .in("booking_status", ["confirmed", "checked_in", "checked_out"])
      .like("stripe_checkout_session_id", `cs_${mode}_%`)
      .order("updated_at", { ascending: false }).order("id")),
    supabase.from("properties").select("id, name"),
    fetchAllAdminRows(() => supabase.from("stripe_payment_events")
      .select("id, stripe_checkout_session_id, stripe_payment_intent_id, event_created_at")
      .eq("outcome", "succeeded").eq("processing_status", "processed")
      .eq("livemode", mode === "live")
      .order("event_created_at", { ascending: true }).order("id")),
  ]);
  if (bookingsResult.error || propertiesResult.error || eventsResult.error || !bookingsResult.data || !propertiesResult.data || !eventsResult.data) {
    return NextResponse.json({ error: "Could not load paid booking receipts." }, { status: 503 });
  }

  const propertyNames = new Map(propertiesResult.data.map((property) => [property.id, property.name]));
  const paidAtBySession = new Map<string, string>();
  const paidAtByIntent = new Map<string, string>();
  for (const event of eventsResult.data) {
    if (event.stripe_checkout_session_id && !paidAtBySession.has(event.stripe_checkout_session_id)) paidAtBySession.set(event.stripe_checkout_session_id, event.event_created_at);
    if (event.stripe_payment_intent_id && !paidAtByIntent.has(event.stripe_payment_intent_id)) paidAtByIntent.set(event.stripe_payment_intent_id, event.event_created_at);
  }
  const modeBookings = bookingsResult.data.filter((booking) => booking.stripe_checkout_session_id?.startsWith(`cs_${mode}_`));
  const groups = new Map<string, typeof modeBookings>();
  for (const booking of modeBookings) {
    const key = booking.group_reference || booking.reference;
    groups.set(key, [...(groups.get(key) ?? []), booking]);
  }
  const receipts = [...groups.entries()].map(([reference, rows]) => {
    const first = rows[0];
    const guest = first.guest_details && typeof first.guest_details === "object" && !Array.isArray(first.guest_details)
      ? first.guest_details as Record<string, unknown> : {};
    const name = first.group_reference
      ? String(guest.contactName ?? guest.firstName ?? "Guest")
      : `${String(guest.firstName ?? "")} ${String(guest.lastName ?? "")}`.trim() || "Guest";
    return {
      code: receiptCode(reference),
      reference,
      type: first.group_reference ? "corporate" : "guest",
      guestName: name,
      companyName: first.group_reference ? String(guest.companyName ?? "") : "",
      guestEmail: String(guest.email ?? ""),
      homes: rows.map((row) => propertyNames.get(row.property_id) ?? "Serenity home"),
      stays: rows.map((row) => ({ home: propertyNames.get(row.property_id) ?? "Serenity home", checkIn: row.check_in, checkout: row.checkout, total: Number(row.total) })),
      checkIn: first.check_in,
      checkout: first.checkout,
      total: Math.round(rows.reduce((sum, row) => sum + Number(row.total), 0) * 100) / 100,
      currency: first.currency,
      paidAt: (first.stripe_checkout_session_id && paidAtBySession.get(first.stripe_checkout_session_id))
        || (first.stripe_payment_intent_id && paidAtByIntent.get(first.stripe_payment_intent_id))
        || first.updated_at,
      stripePaymentIntentId: first.stripe_payment_intent_id,
      stripeCheckoutSessionId: first.stripe_checkout_session_id,
    };
  }).sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  return NextResponse.json({ receipts, mode }, { headers: { "Cache-Control": "private, no-store" } });
}
