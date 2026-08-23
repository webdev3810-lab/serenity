import { NextResponse } from "next/server";
import { calculatePrice, defaultGuests, todayIso, validateDateRange, validateGuestCapacity, type GuestCounts } from "@/src/lib/booking";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { getPublicPropertyBySlug } from "@/src/lib/supabase/content";
import type { Json } from "@/src/lib/supabase/types";

const reference = () => `ADM-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const guestCounts = (value: unknown): GuestCounts => {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    adults: Math.max(1, Number(row.adults ?? defaultGuests.adults)),
    children: Math.max(0, Number(row.children ?? 0)),
    infants: Math.max(0, Number(row.infants ?? 0)),
    pets: Math.max(0, Number(row.pets ?? 0)),
  };
};

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const propertyId = String(body.propertyId ?? "").trim();
    const checkIn = String(body.checkIn ?? "");
    const checkout = String(body.checkout ?? "");
    const contactName = String(body.contactName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const companyName = String(body.companyName ?? "").trim();
    const internalNotes = String(body.internalNotes ?? "").trim();
    const corporate = body.corporate === true;
    const guests = guestCounts(body.guests);
    const idempotencyKey = String(request.headers.get("Idempotency-Key") ?? body.idempotencyKey ?? "").trim() || `admin:${crypto.randomUUID()}`;
    const paymentStatus = String(body.paymentStatus ?? "pending");
    if (!propertyId || !checkIn || !checkout || !contactName || !email) return NextResponse.json({ error: "House, dates, guest name, and email are required." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid guest email address." }, { status: 400 });
    if (!(["pending", "paid"] as const).includes(paymentStatus as "pending" | "paid")) return NextResponse.json({ error: "Manual bookings can start as pending or paid." }, { status: 400 });
    if (internalNotes.length > 4000) return NextResponse.json({ error: "Internal notes must be 4,000 characters or fewer." }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: propertyRow, error: propertyError } = await supabase.from("properties").select("id, slug, unavailable_dates, corporate_booking_allowed").eq("id", propertyId).maybeSingle();
    if (propertyError) throw propertyError;
    if (!propertyRow) return NextResponse.json({ error: "House not found." }, { status: 404 });
    if (corporate && !propertyRow.corporate_booking_allowed) return NextResponse.json({ error: "Corporate bookings are disabled for this house." }, { status: 409 });
    const property = await getPublicPropertyBySlug(propertyRow.slug);
    if (!property) return NextResponse.json({ error: "House details could not be loaded." }, { status: 409 });
    const dateError = validateDateRange(property, checkIn, checkout, todayIso(), propertyRow.unavailable_dates ?? [], corporate);
    const guestError = validateGuestCapacity(property, guests);
    if (dateError || guestError) return NextResponse.json({ error: dateError || guestError }, { status: 400 });

    const bookingReference = reference();
    const price = calculatePrice(property, checkIn, checkout, guests, corporate);
    const rows = [{
      reference: bookingReference,
      property_id: propertyId,
      check_in: checkIn,
      checkout,
      adults: guests.adults,
      children: guests.children,
      infants: guests.infants,
      pets: guests.pets,
      guest_details: { firstName: contactName, contactName, email, phone, companyName },
      corporate_details: corporate ? { corporate: true, companyName } : {},
      price_breakdown: price,
      total: price.total,
      currency: "AUD",
      payment_status: paymentStatus,
      booking_status: corporate ? "corporate" : "confirmed",
      booking_type: corporate ? "corporate" : "admin",
      booking_source: "admin",
      internal_notes: internalNotes,
      created_by_admin: admin.user.id,
      notes: String(body.guestNotes ?? "").slice(0, 1000),
    }];
    const { data, error } = await supabase.rpc("create_booking_group", {
      p_rows: rows as unknown as Json,
      p_group_reference: bookingReference,
      p_enquiry_id: null,
      p_idempotency_key: idempotencyKey,
    });
    if (error) {
      const conflict = error.code === "23P01" || error.code === "23505";
      return NextResponse.json({ error: conflict ? "Those dates are no longer available." : error.message || "Could not create the booking." }, { status: conflict ? 409 : 500 });
    }
    return NextResponse.json({ booking: data?.[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the booking." }, { status: 500 });
  }
}
