import { NextResponse } from "next/server";
import { addDays, datesInRange, todayIso } from "@/src/lib/booking";
import { getPublicPropertyBySlug, isLocalContentPreview } from "@/src/lib/supabase/content";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const ACTIVE_BOOKING_STATUSES = ["pending_payment", "confirmed", "corporate", "checked_in"];

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fallback = await getPublicPropertyBySlug(slug);
  if (!fallback) return NextResponse.json({ error: "Published property not found." }, { status: 404 });

  const url = new URL(request.url);
  const start = url.searchParams.get("start") || todayIso();
  const end = url.searchParams.get("end") || addDays(start, 370);
  if (end <= start) return NextResponse.json({ error: "Availability range is invalid." }, { status: 400 });

  const localBlockedDates = fallback.unavailableDates.filter((date) => date >= start && date < end);
  if (isLocalContentPreview || !isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ source: "local", blockedDates: localBlockedDates });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: propertyRow, error: propertyError } = await supabase
      .from("properties")
      .select("id, unavailable_dates")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (propertyError) throw propertyError;
    if (!propertyRow) return NextResponse.json({ error: "Published property not found." }, { status: 404 });

    const [{ data: bookings, error: bookingsError }, { data: calendarEvents, error: calendarError }] = await Promise.all([
      supabase
        .from("bookings")
        .select("check_in, checkout, booking_status")
        .eq("property_id", propertyRow.id)
        .in("booking_status", ACTIVE_BOOKING_STATUSES)
        .lt("check_in", end)
        .gt("checkout", start),
      supabase
        .from("calendar_events")
        .select("start_date, end_date")
        .eq("property_id", propertyRow.id)
        .eq("status", "active")
        .eq("is_blocking", true)
        .lt("start_date", end)
        .gt("end_date", start),
    ]);
    if (bookingsError) throw bookingsError;
    if (calendarError) throw calendarError;

    const bookedDates = (bookings ?? []).flatMap((booking) => {
      const bookingStart = booking.check_in > start ? booking.check_in : start;
      const bookingEnd = booking.checkout < end ? booking.checkout : end;
      return bookingEnd > bookingStart ? datesInRange(bookingStart, bookingEnd) : [];
    });
    const calendarBlockedDates = (calendarEvents ?? []).flatMap((event) => {
      const eventStart = event.start_date > start ? event.start_date : start;
      const eventEnd = event.end_date < end ? event.end_date : end;
      return eventEnd > eventStart ? datesInRange(eventStart, eventEnd) : [];
    });
    const unavailableDates = Array.isArray(propertyRow.unavailable_dates) ? propertyRow.unavailable_dates : [];
    const blockedDates = [...new Set([...localBlockedDates, ...unavailableDates.filter((date) => date >= start && date < end), ...bookedDates, ...calendarBlockedDates])].sort();
    return NextResponse.json({ source: "supabase", propertyId: propertyRow.id, blockedDates });
  } catch (error) {
    console.error("Availability lookup failed", error);
    return NextResponse.json({ source: "local-fallback", blockedDates: localBlockedDates, warning: "Live availability is temporarily unavailable." });
  }
}
