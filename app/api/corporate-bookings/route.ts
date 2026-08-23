import { NextResponse } from "next/server";
import { calculatePrice, defaultGuests, datesInRange, todayIso, validateDateRange, validateGuestCapacity, type GuestCounts } from "@/src/lib/booking";
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

const asGuestCounts = (value: unknown): GuestCounts => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    adults: Math.max(1, Number(raw.adults ?? defaultGuests.adults)),
    children: Math.max(0, Number(raw.children ?? 0)),
    infants: Math.max(0, Number(raw.infants ?? 0)),
    pets: Math.max(0, Number(raw.pets ?? 0)),
  };
};

const corporateReference = () => `CORP-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const propertySlugs = Array.isArray(body.propertySlugs)
      ? Array.from(new Set(body.propertySlugs.map((slug) => String(slug).trim()).filter(Boolean)))
      : [];
    const checkIn = String(body.checkIn ?? body.arrival ?? "");
    const checkout = String(body.checkout ?? body.departure ?? "");
    const companyName = String(body.companyName ?? "").trim();
    const customerId = String(body.customerId ?? "").trim().toUpperCase();
    const contactName = String(body.contactName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const guests = asGuestCounts(body.guests);
    const idempotencyKey = String(request.headers.get("Idempotency-Key") ?? body.idempotencyKey ?? "").trim();

    if (!customerId || !propertySlugs.length || propertySlugs.length > 3 || !checkIn || !checkout || !companyName || !contactName || !email || !phone) {
      return NextResponse.json({ error: "Enter your corporate customer ID, choose at least one house and dates, and complete the company contact details." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid business email address." }, { status: 400 });
    if (idempotencyKey.length > 128 || customerId.length > 80 || notes.length > 1000 || companyName.length > 160 || contactName.length > 120 || email.length > 150 || phone.length > 30) {
      return NextResponse.json({ error: "Please shorten one or more reservation fields." }, { status: 400 });
    }

    if (isLocalContentPreview || !isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ configured: false, preview: true, booking: { reference: corporateReference() } });
    }

    const supabase = createSupabaseAdminClient();
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
          ...(body.corporateDetails && typeof body.corporateDetails === "object" ? body.corporateDetails : {}),
          corporate: true,
          customerId,
          groupReference,
          abn: String(body.abn ?? ""),
          purchaseOrder: String(body.purchaseOrder ?? ""),
          invoiceRequested: body.invoiceRequested === true,
        },
        price_breakdown: price,
        total: price.total,
        currency: "AUD",
        payment_status: "pending",
        booking_status: "corporate",
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

    const resolvedReference = bookings?.[0]?.group_reference || groupReference;
    return NextResponse.json({ configured: true, booking: { reference: resolvedReference, propertySlugs, nights: datesInRange(checkIn, checkout).length, bookingIds: bookings?.map((booking) => booking.id) ?? [] } }, { status: 201 });
  } catch (error) {
    console.error("Corporate reservation persistence failed", error);
    return NextResponse.json({ error: "We could not save this corporate reservation. Please try again." }, { status: 500 });
  }
}
