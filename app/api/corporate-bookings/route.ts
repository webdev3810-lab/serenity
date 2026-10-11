import { NextResponse } from "next/server";
import Stripe from "stripe";
import { calculatePrice, defaultGuests, datesInRange, todayIso, validateDateRange, validateGuestCapacity } from "@/src/lib/booking";
import { getPublicPropertyBySlug, isLocalContentPreview } from "@/src/lib/supabase/content";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import type { Json } from "@/src/lib/supabase/types";
import { canBookCorporateDirectly } from "@/src/lib/reservationRules";

type CorporatePropertyRow = {
  id: string;
  slug: string;
  corporate_booking_allowed: boolean;
  minimum_corporate_stay: number;
  minimum_corporate_houses: number;
  maximum_corporate_houses: number;
  adjacent_houses_allowed: boolean;
  instant_booking_enabled: boolean;
  booking_request_required: boolean;
  corporate_approval_required: boolean;
  unavailable_dates: string[] | null;
};

const ACTIVE_BOOKING_STATUSES = ["pending_payment", "confirmed", "corporate", "checked_in"];

const corporateReference = () => `CORP-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
const partnerIdPattern = /^SER-(?:[A-F0-9]{12}|[A-F0-9]{20})$/;

const getRequestOrigin = (request: Request) => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return new URL(request.url).origin;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const propertySlugs = Array.isArray(body.propertySlugs)
      ? Array.from(new Set(body.propertySlugs.map((slug) => String(slug).trim()).filter(Boolean)))
      : [];
    const checkIn = String(body.checkIn ?? body.arrival ?? "");
    const checkout = String(body.checkout ?? body.departure ?? "");
    const customerId = String(body.customerId ?? "").trim().toUpperCase();
    const notes = String(body.notes ?? "").trim();
    const guestCount = Number(body.guestCount);
    const guests = { ...defaultGuests, adults: Math.ceil(guestCount / propertySlugs.length) };
    const idempotencyKey = String(request.headers.get("Idempotency-Key") ?? body.idempotencyKey ?? "").trim();

    if (!partnerIdPattern.test(customerId) || !propertySlugs.length || propertySlugs.length > 3 || !checkIn || !checkout) {
      return NextResponse.json({ error: "A valid Partner ID, houses, and dates are required for corporate booking." }, { status: 400 });
    }
    if (!Number.isInteger(guestCount) || guestCount < propertySlugs.length || guestCount > 21) {
      return NextResponse.json({ error: "Enter the exact number of guests, with at least one guest per house." }, { status: 400 });
    }
    if (idempotencyKey.length > 128 || notes.length > 1000) {
      return NextResponse.json({ error: "Please shorten one or more reservation fields." }, { status: 400 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (isLocalContentPreview || !isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY || !stripeSecretKey || (stripeSecretKey.startsWith("sk_live_") && !process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"))) {
      return NextResponse.json({ error: "Secure corporate checkout is temporarily unavailable." }, { status: 503 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: partner, error: partnerError } = await supabase.from("corporate_partners")
      .select("id, company_name, contact_name, email, phone, abn, purchase_order, invoice_requested")
      .eq("partner_id", customerId).eq("active", true).maybeSingle();
    if (partnerError) throw partnerError;
    if (!partner) return NextResponse.json({ error: "Partner ID not found or inactive. Check the ID issued by Serenity." }, { status: 403 });
    const companyName = partner.company_name;
    const contactName = partner.contact_name;
    const email = partner.email;
    const phone = partner.phone;
    const { data: propertyRows, error: propertyError } = await supabase
      .from("properties")
      .select("id, slug, corporate_booking_allowed, minimum_corporate_stay, minimum_corporate_houses, maximum_corporate_houses, adjacent_houses_allowed, instant_booking_enabled, booking_request_required, corporate_approval_required, unavailable_dates")
      .in("slug", propertySlugs)
      .eq("published", true);
    if (propertyError) throw propertyError;

    const rows = (propertyRows ?? []) as CorporatePropertyRow[];
    if (rows.length !== propertySlugs.length) return NextResponse.json({ error: "One or more selected houses are no longer available." }, { status: 409 });
    const orderedRows = propertySlugs.map((slug) => rows.find((row) => row.slug === slug)).filter((row): row is CorporatePropertyRow => Boolean(row));
    if (orderedRows.some((row) => !row.corporate_booking_allowed || (propertySlugs.length > 1 && !row.adjacent_houses_allowed))) {
      return NextResponse.json({ error: "One or more selected houses are not enabled for corporate reservations." }, { status: 409 });
    }
    if (orderedRows.some((row) => propertySlugs.length < row.minimum_corporate_houses || propertySlugs.length > row.maximum_corporate_houses)) {
      return NextResponse.json({ error: "The selected house combination is outside the configured corporate booking rules." }, { status: 400 });
    }
    if (!canBookCorporateDirectly(orderedRows.map((row) => ({ corporateBookingAllowed: row.corporate_booking_allowed, instantBookingEnabled: row.instant_booking_enabled, bookingRequestRequired: row.booking_request_required, corporateApprovalRequired: row.corporate_approval_required })))) {
      return NextResponse.json({ error: "These houses require a corporate enquiry and approval before they can be reserved." }, { status: 409 });
    }

    const properties = await Promise.all(orderedRows.map((row) => getPublicPropertyBySlug(row.slug)));
    if (properties.some((property) => !property)) return NextResponse.json({ error: "A selected house could not be loaded." }, { status: 409 });
    const loadedProperties = properties.filter((property): property is NonNullable<typeof property> => Boolean(property));
    for (const [index, property] of loadedProperties.entries()) {
      const dateError = validateDateRange(property, checkIn, checkout, todayIso(), orderedRows[index].unavailable_dates ?? [], true);
      const guestError = validateGuestCapacity(property, guests);
      if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });
      if (guestError) return NextResponse.json({ error: guestError }, { status: 400 });
    }

    const propertyIds = orderedRows.map((row) => row.id);
    const [{ data: overlappingBookings, error: overlapError }, { data: calendarEvents, error: calendarError }] = await Promise.all([
      supabase.from("bookings").select("property_id").in("property_id", propertyIds).in("booking_status", ACTIVE_BOOKING_STATUSES).lt("check_in", checkout).gt("checkout", checkIn),
      supabase.from("calendar_events").select("property_id").in("property_id", propertyIds).eq("status", "active").eq("is_blocking", true).lt("start_date", checkout).gt("end_date", checkIn),
    ]);
    if (overlapError) throw overlapError;
    if (calendarError) throw calendarError;
    if (overlappingBookings?.length || calendarEvents?.length) return NextResponse.json({ error: "One or more selected houses are no longer available for those dates." }, { status: 409 });

    const groupReference = corporateReference();
    const bookingRows = loadedProperties.map((property, index) => {
      const price = calculatePrice(property, checkIn, checkout, guests, true);
      return {
        reference: `${groupReference}-${String(index + 1).padStart(2, "0")}`,
        property_id: orderedRows[index].id,
        check_in: checkIn,
        checkout,
        adults: guests.adults,
        children: guests.children,
        infants: guests.infants,
        pets: guests.pets,
        guest_details: { companyName, contactName, firstName: contactName, email, phone, corporate: true },
        corporate_details: {
          corporate: true,
          customerId,
          partnerAccountId: partner.id,
          groupReference,
          abn: partner.abn,
          purchaseOrder: partner.purchase_order,
          invoiceRequested: partner.invoice_requested,
        },
        price_breakdown: price,
        total: price.total,
        currency: "AUD",
        payment_status: "pending",
        booking_status: "pending_payment",
        booking_type: "corporate",
        booking_source: "corporate_page",
        group_reference: groupReference,
        notes,
      };
    });

    const { data: bookings, error: insertError } = await supabase.rpc("create_booking_group", {
      p_rows: bookingRows as unknown as Json,
      p_group_reference: groupReference,
      p_enquiry_id: null,
      p_idempotency_key: idempotencyKey || null,
    });
    if (insertError) {
      if (insertError.code === "23P01" || insertError.code === "23505") return NextResponse.json({ error: "Those dates are no longer available." }, { status: 409 });
      throw insertError;
    }

    if (!bookings?.length) throw new Error("Corporate booking group was not created.");
    const resolvedReference = bookings[0].group_reference || groupReference;
    const stripe = new Stripe(stripeSecretKey);
    const existingSessionId = bookings[0].stripe_checkout_session_id;
    if (existingSessionId) {
      const existingSession = await stripe.checkout.sessions.retrieve(existingSessionId);
      if (existingSession.status === "open" && existingSession.url) return NextResponse.json({ checkoutUrl: existingSession.url });
      return NextResponse.json({ error: "This checkout has expired or completed. Please start a new booking." }, { status: 409 });
    }

    const totalCents = bookings.reduce((sum, booking) => sum + Math.round(Number(booking.total) * 100), 0);
    const origin = getRequestOrigin(request);
    const metadata = { bookingId: bookings[0].id, reference: bookings[0].reference, groupReference: resolvedReference, corporate: "true", currency: "AUD" };
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: bookings[0].id,
        adaptive_pricing: { enabled: false },
        customer_email: email,
        expires_at: Math.floor(Date.now() / 1000) + 1860,
        success_url: `${origin}/corporate-stays/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/corporate-stays#corporate-booking`,
        line_items: [{ price_data: { currency: "aud", product_data: { name: `Serenity corporate stay · ${propertySlugs.length} house${propertySlugs.length === 1 ? "" : "s"}`, description: `${datesInRange(checkIn, checkout).length} nights from ${checkIn} to ${checkout}.` }, unit_amount: totalCents }, quantity: 1 }],
        metadata,
        payment_intent_data: { metadata, description: `Serenity corporate reservation ${resolvedReference}` },
      }, { idempotencyKey: `serenity-corporate-${resolvedReference}` });
    } catch (stripeError) {
      await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("group_reference", resolvedReference).eq("booking_status", "pending_payment");
      throw stripeError;
    }
    if (!session.url) {
      await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("group_reference", resolvedReference).eq("booking_status", "pending_payment");
      throw new Error("Stripe did not return a checkout URL.");
    }
    const { error: sessionUpdateError } = await supabase.from("bookings").update({ stripe_checkout_session_id: session.id }).eq("group_reference", resolvedReference).eq("booking_status", "pending_payment");
    if (sessionUpdateError) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("group_reference", resolvedReference).eq("booking_status", "pending_payment");
      throw sessionUpdateError;
    }
    return NextResponse.json({ configured: true, checkoutUrl: session.url });
  } catch (error) {
    console.error("Corporate reservation persistence failed", error);
    return NextResponse.json({ error: "We could not save this corporate reservation. Please try again." }, { status: 500 });
  }
}
