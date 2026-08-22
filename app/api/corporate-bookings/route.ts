import { NextResponse } from "next/server";
import { calculatePrice, defaultGuests, datesInRange, todayIso, validateDateRange, validateGuestCapacity, type GuestCounts } from "@/src/lib/booking";
import { getPublicPropertyBySlug, isLocalContentPreview } from "@/src/lib/supabase/content";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type CorporatePropertyRow = {
  id: string;
  slug: string;
  corporate_booking_allowed: boolean;
  minimum_corporate_stay: number;
  minimum_corporate_houses: number;
  maximum_corporate_houses: number;
  adjacent_houses_allowed: boolean;
  unavailable_dates: string[] | null;
};

type PersistenceError = Error & { code?: string };

const asGuestCounts = (value: unknown): GuestCounts => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    adults: Math.max(1, Number(raw.adults ?? defaultGuests.adults)),
    children: Math.max(0, Number(raw.children ?? 0)),
    infants: Math.max(0, Number(raw.infants ?? 0)),
    pets: Math.max(0, Number(raw.pets ?? 0)),
  };
};

const corporateReference = () => `CORP-${new Date().getUTCFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const propertySlugs = Array.isArray(body.propertySlugs)
      ? Array.from(new Set(body.propertySlugs.map((slug) => String(slug).trim()).filter(Boolean)))
      : [];
    const checkIn = String(body.checkIn ?? "");
    const checkout = String(body.checkout ?? "");
    const companyName = String(body.companyName ?? "").trim();
    const contactName = String(body.contactName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const guests = asGuestCounts(body.guests);

    if (!propertySlugs.length || propertySlugs.length > 3 || !checkIn || !checkout || !companyName || !contactName || !email || !phone) {
      return NextResponse.json({ error: "Choose at least one house, dates, and complete company contact details." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid business email address." }, { status: 400 });
    if (notes.length > 1000 || companyName.length > 160 || contactName.length > 120 || email.length > 150 || phone.length > 30) {
      return NextResponse.json({ error: "Please shorten one or more reservation fields." }, { status: 400 });
    }

    // Local preview mode can demonstrate the complete no-payment flow without
    // requiring Supabase to be seeded. It intentionally does not claim to persist.
    if (isLocalContentPreview || !isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ configured: false, preview: true, booking: { reference: corporateReference() } });
    }

    const supabase = createSupabaseAdminClient();
    const { data: propertyRows, error: propertyError } = await supabase
      .from("properties")
      .select("id, slug, corporate_booking_allowed, minimum_corporate_stay, minimum_corporate_houses, maximum_corporate_houses, adjacent_houses_allowed, unavailable_dates")
      .in("slug", propertySlugs)
      .eq("published", true);
    if (propertyError) throw propertyError;

    const rows = (propertyRows ?? []) as CorporatePropertyRow[];
    if (rows.length !== propertySlugs.length) return NextResponse.json({ error: "One or more selected houses are not available for corporate reservations." }, { status: 409 });
    const orderedRows = propertySlugs.map((slug) => rows.find((row) => row.slug === slug)).filter((row): row is CorporatePropertyRow => Boolean(row));
    const firstRule = orderedRows[0];
    if (!firstRule) return NextResponse.json({ error: "No selected house is available." }, { status: 409 });
    if (orderedRows.some((row) => !row.corporate_booking_allowed || !row.adjacent_houses_allowed)) return NextResponse.json({ error: "One or more selected houses are not enabled for corporate reservations." }, { status: 409 });
    if (propertySlugs.length < firstRule.minimum_corporate_houses || propertySlugs.length > firstRule.maximum_corporate_houses) {
      return NextResponse.json({ error: `Select between ${firstRule.minimum_corporate_houses} and ${firstRule.maximum_corporate_houses} houses for this corporate reservation.` }, { status: 400 });
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
    const { data: overlappingBookings, error: overlapError } = await supabase
      .from("bookings")
      .select("property_id")
      .in("property_id", propertyIds)
      .in("booking_status", ["pending_payment", "confirmed", "corporate", "checked_in"])
      .lt("check_in", checkout)
      .gt("checkout", checkIn);
    if (overlapError) throw overlapError;
    if (overlappingBookings?.length) return NextResponse.json({ error: "One or more selected houses are already booked for those dates." }, { status: 409 });
    const { data: calendarEvents, error: calendarError } = await supabase
      .from("calendar_events")
      .select("property_id")
      .in("property_id", propertyIds)
      .eq("status", "active")
      .eq("is_blocking", true)
      .lt("start_date", checkout)
      .gt("end_date", checkIn);
    if (calendarError) throw calendarError;
    if (calendarEvents?.length) return NextResponse.json({ error: "One or more selected houses are blocked by an external calendar for those dates." }, { status: 409 });

    const groupReference = corporateReference();
    const insertedIds: string[] = [];
    try {
      for (const [index, property] of loadedProperties.entries()) {
        const price = calculatePrice(property, checkIn, checkout, guests, true);
        const reference = `${groupReference}-${String(index + 1).padStart(2, "0")}`;
        const { data: booking, error } = await supabase.from("bookings").insert({
          reference,
          property_id: orderedRows[index].id,
          check_in: checkIn,
          checkout,
          adults: guests.adults,
          children: guests.children,
          infants: guests.infants,
          pets: guests.pets,
          guest_details: { companyName, contactName, email, phone, corporate: true },
          corporate_details: { ...(body.corporateDetails && typeof body.corporateDetails === "object" ? body.corporateDetails : {}), corporate: true, groupReference },
          price_breakdown: price,
          total: price.total,
          currency: "AUD",
          payment_status: "pending",
          booking_status: "corporate",
          notes,
        }).select("id").single();
        if (error) {
          const persistenceError = new Error(error.message) as PersistenceError;
          persistenceError.code = error.code;
          throw persistenceError;
        }
        if (booking?.id) insertedIds.push(booking.id);
      }
    } catch (error) {
      if (insertedIds.length) await supabase.from("bookings").delete().in("id", insertedIds);
      if ((error as PersistenceError).code === "23P01") {
        return NextResponse.json({ error: "Those dates are no longer available." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ configured: true, booking: { reference: groupReference, propertySlugs, nights: datesInRange(checkIn, checkout).length } });
  } catch (error) {
    console.error("Corporate reservation persistence failed", error);
    return NextResponse.json({ error: "We could not save this corporate reservation. Please try again." }, { status: 500 });
  }
}
