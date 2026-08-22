import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { ACTIVE_BOOKING_STATUSES, calendarRangesOverlap } from "@/src/lib/calendar/conflicts";
import { CALENDAR_PLATFORM_LABELS, CALENDAR_PLATFORMS, type CalendarPlatform } from "@/src/lib/calendar/types";
import { validateCalendarFeedUrl } from "@/src/lib/calendar/validation";

const TARGET_PROPERTY_SLUGS = ["serenity-7", "serenity-9", "serenity-11"];

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const [{ data: properties, error: propertyError }, { data: connections, error: connectionError }] = await Promise.all([
    supabase.from("properties").select("id, name, slug").in("slug", TARGET_PROPERTY_SLUGS).order("display_order"),
    supabase.from("calendar_connections").select("id, property_id, platform, connection_type, external_calendar_url, is_enabled, last_synced_at, last_success_at, last_error, sync_status").order("platform"),
  ]);
  if (propertyError || connectionError) return NextResponse.json({ error: propertyError?.message ?? connectionError?.message ?? "Could not load calendar connections." }, { status: 500 });

  const propertyIds = (properties ?? []).map((property) => property.id);
  const [{ data: events, error: eventError }, { data: bookings, error: bookingError }] = propertyIds.length ? await Promise.all([
    supabase.from("calendar_events").select("id, property_id, connection_id, source_platform, start_date, end_date, status, is_blocking, summary").in("property_id", propertyIds),
    supabase.from("bookings").select("property_id, check_in, checkout").in("property_id", propertyIds).in("booking_status", [...ACTIVE_BOOKING_STATUSES]),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (eventError || bookingError) return NextResponse.json({ error: eventError?.message ?? bookingError?.message ?? "Could not load calendar conflicts." }, { status: 500 });

  const activeEvents = (events ?? []).filter((event) => event.status === "active" && event.is_blocking);
  const conflicts = activeEvents.flatMap((event) => (bookings ?? [])
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
          importedEventCount: connection.connection_type === "import" ? activeEvents.filter((event) => event.connection_id === connection.id).length : 0,
          hasExportToken: connection.connection_type === "export" && connection.is_enabled,
        })),
      directBlocks: activeEvents
        .filter((event) => event.property_id === property.id && event.source_platform === "direct" && !event.connection_id)
        .map((event) => ({ id: event.id, startDate: event.start_date, endDate: event.end_date, summary: event.summary })),
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
    const validation = validateCalendarFeedUrl(externalUrl);
    if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: property } = await supabase.from("properties").select("id").eq("id", propertyId).maybeSingle();
    if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });
    const { data, error } = await supabase.from("calendar_connections").upsert({
      property_id: propertyId,
      platform,
      connection_type: "import",
      external_calendar_url: externalUrl,
      is_enabled: true,
      last_error: "",
      sync_status: "pending",
    }, { onConflict: "property_id,platform,connection_type" }).select("id, property_id, platform, connection_type, external_calendar_url, is_enabled, last_synced_at, last_success_at, last_error, sync_status").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ connection: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save calendar connection." }, { status: 500 });
  }
}
