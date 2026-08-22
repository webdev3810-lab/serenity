import { hashCalendarToken } from "@/src/lib/calendar/security";
import { buildIcsCalendar, groupCalendarDates } from "@/src/lib/calendar/ical";
import { ACTIVE_BOOKING_STATUSES } from "@/src/lib/calendar/conflicts";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { NextResponse } from "next/server";

function todayInUtc() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request, { params }: { params: Promise<{ propertySlug: string }> }) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token") ?? "";
  if (!token || token.length < 20) return new Response("Not found", { status: 404 });
  const { propertySlug } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: property } = await supabase.from("properties").select("id, unavailable_dates").eq("slug", propertySlug).maybeSingle();
  if (!property) return new Response("Not found", { status: 404 });
  const { data: connection } = await supabase.from("calendar_connections").select("id").eq("property_id", property.id).eq("platform", "direct").eq("connection_type", "export").eq("is_enabled", true).eq("export_token_hash", hashCalendarToken(token)).maybeSingle();
  if (!connection) return new Response("Not found", { status: 404 });

  const startDate = todayInUtc();
  const [{ data: bookings, error: bookingError }, { data: importedEvents, error: eventError }] = await Promise.all([
    supabase.from("bookings").select("id, check_in, checkout").eq("property_id", property.id).in("booking_status", [...ACTIVE_BOOKING_STATUSES]).gte("checkout", startDate),
    supabase.from("calendar_events").select("id, source_platform, start_date, end_date, summary").eq("property_id", property.id).eq("status", "active").eq("is_blocking", true).gte("end_date", startDate),
  ]);
  if (bookingError || eventError) return NextResponse.json({ error: "Calendar unavailable." }, { status: 500 });

  const unavailableDates = (property.unavailable_dates ?? []).filter((date) => date >= startDate);
  const excludedSource = requestUrl.searchParams.get("source") ?? "";
  const events = [
    ...groupCalendarDates(unavailableDates).map((range) => ({ uid: `unavailable:${property.id}:${range.startDate}@serenitystays.com.au`, startDate: range.startDate, endDate: range.endDate, summary: "Unavailable" })),
    ...(bookings ?? []).map((booking) => ({ uid: `booking:${booking.id}@serenitystays.com.au`, startDate: booking.check_in, endDate: booking.checkout, summary: "Reserved" })),
    ...(importedEvents ?? [])
      .filter((event) => event.source_platform !== excludedSource)
      .map((event) => ({ uid: `external:${event.id}@serenitystays.com.au`, startDate: event.start_date, endDate: event.end_date, summary: event.summary || "Unavailable" })),
  ];

  return new Response(buildIcsCalendar(events), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": `inline; filename="${propertySlug}.ics"`,
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
}
