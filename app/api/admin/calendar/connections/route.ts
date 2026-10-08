import { fetchAllAdminRows } from "@/src/lib/admin-pagination";
import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { ACTIVE_BOOKING_STATUSES, calendarRangesOverlap } from "@/src/lib/calendar/conflicts";
import { CALENDAR_PLATFORM_LABELS, CALENDAR_PLATFORMS, type CalendarPlatform } from "@/src/lib/calendar/types";
import { syncCalendarConnections, testCalendarFeed } from "@/src/lib/calendar/sync";

const TARGET_PROPERTY_SLUGS = ["serenity-7", "serenity-9", "serenity-11"];

function blockedNightCount(events: Array<{ start_date: string; end_date: string }>) {
  return events.reduce((count, event) => count + Math.max(0, Math.round((new Date(`${event.end_date}T00:00:00Z`).getTime() - new Date(`${event.start_date}T00:00:00Z`).getTime()) / 86_400_000)), 0);
}

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const [{ data: properties, error: propertyError }, { data: connections, error: connectionError }] = await Promise.all([
    fetchAllAdminRows(() => supabase.from("properties").select("id, name, slug").in("slug", TARGET_PROPERTY_SLUGS).order("display_order").order("id")),
    fetchAllAdminRows(() => supabase.from("calendar_connections").select("id, property_id, platform, connection_type, external_calendar_url, is_enabled, last_synced_at, last_attempt_at, last_success_at, last_error, last_imported_event_count, sync_frequency_minutes, sync_status").order("platform").order("id")),
  ]);
  if (propertyError || connectionError) return NextResponse.json({ error: propertyError?.message ?? connectionError?.message ?? "Could not load calendar connections." }, { status: 500 });

  const propertyIds = (properties ?? []).map((property) => property.id);
  const [{ data: events, error: eventError }, { data: bookings, error: bookingError }] = propertyIds.length ? await Promise.all([
    fetchAllAdminRows(() => supabase.from("calendar_events").select("id, property_id, connection_id, external_event_id, source_platform, start_date, end_date, status, is_blocking, summary, block_reason, internal_note").in("property_id", propertyIds).order("id")),
    fetchAllAdminRows(() => supabase.from("bookings").select("id, property_id, check_in, checkout").in("property_id", propertyIds).in("booking_status", [...ACTIVE_BOOKING_STATUSES]).order("id")),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (eventError || bookingError) return NextResponse.json({ error: eventError?.message ?? bookingError?.message ?? "Could not load calendar conflicts." }, { status: 500 });

  const currentEvents = (events ?? []).filter((event) => event.status === "active");
  const blockingEvents = currentEvents.filter((event) => event.is_blocking);
  const conflicts = currentEvents.flatMap((event) => (bookings ?? [])
    .filter((booking) => booking.property_id === event.property_id && calendarRangesOverlap(event.start_date, event.end_date, booking.check_in, booking.checkout))
    .map(() => ({ propertyId: event.property_id, platform: event.source_platform, startDate: event.start_date, endDate: event.end_date })));

  return NextResponse.json({
    properties: (properties ?? []).map((property) => ({
      ...property,
      connections: (connections ?? [])
        .filter((connection) => connection.property_id === property.id)
        .map((connection) => ({
          ...connection,
          platformLabel: connection.platform === "direct" ? "Serenity" : CALENDAR_PLATFORM_LABELS[connection.platform as CalendarPlatform],
          importedEventCount: connection.connection_type === "import" ? blockedNightCount(currentEvents.filter((event) => event.connection_id === connection.id)) : 0,
          hasExportToken: connection.connection_type === "export" && connection.is_enabled,
        })),
      directBlocks: blockingEvents
        .filter((event) => event.property_id === property.id && event.source_platform === "direct" && !event.connection_id && !event.external_event_id.startsWith("ical-upload:"))
        .map((event) => ({ id: event.id, startDate: event.start_date, endDate: event.end_date, summary: event.summary, blockReason: event.block_reason, internalNote: event.internal_note })),
      uploadedCalendar: {
        eventCount: currentEvents.filter((event) => event.property_id === property.id && event.external_event_id.startsWith("ical-upload:") && event.is_blocking).length,
      },
      calendarItems: [
        ...currentEvents.filter((event) => event.property_id === property.id).map((event) => ({
          id: event.id,
          startDate: event.start_date,
          endDate: event.end_date,
          source: event.external_event_id.startsWith("ical-upload:") ? "uploaded" : event.source_platform,
          label: event.summary || "Unavailable",
        })),
        ...(bookings ?? []).filter((booking) => booking.property_id === property.id).map((booking) => ({
          id: booking.id,
          startDate: booking.check_in,
          endDate: booking.checkout,
          source: "direct",
          label: "Serenity booking",
        })),
      ],
      conflicts: conflicts.filter((conflict) => conflict.propertyId === property.id),
    })),
  });
}

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  try {
    const body = await request.json() as { propertyId?: string; platform?: string; externalUrl?: string };
    const propertyId = body.propertyId?.trim();
    const platform = body.platform as CalendarPlatform | undefined;
    const externalUrl = body.externalUrl?.trim() ?? "";
    if (!propertyId || !platform || !CALENDAR_PLATFORMS.includes(platform)) return NextResponse.json({ error: "Choose a property and supported calendar platform." }, { status: 400 });
    let feedTest: Awaited<ReturnType<typeof testCalendarFeed>>;
    try {
      feedTest = await testCalendarFeed(externalUrl);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "The iCal feed could not be validated." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: property } = await supabase.from("properties").select("id").eq("id", propertyId).maybeSingle();
    if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });
    const { data, error } = await supabase.from("calendar_connections").upsert({
      property_id: propertyId,
      platform,
      connection_type: "import",
      external_calendar_url: feedTest.normalizedUrl,
      is_enabled: true,
      last_error: "",
      sync_status: "pending",
    }, { onConflict: "property_id,platform,connection_type" }).select("id, property_id, platform, connection_type, external_calendar_url, is_enabled, last_synced_at, last_attempt_at, last_success_at, last_error, last_imported_event_count, sync_frequency_minutes, sync_status").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    let sync: { status: "error" | "success" | "conflict"; message: string };
    try {
      [sync] = await syncCalendarConnections({ propertyId, platform });
    } catch (syncError) {
      sync = { status: "error", message: syncError instanceof Error ? syncError.message : "The first calendar sync failed." };
    }
    return NextResponse.json({ connection: data, test: feedTest, sync });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save calendar connection." }, { status: 500 });
  }
}
