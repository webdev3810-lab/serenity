import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { calendarRangesOverlap } from "@/src/lib/calendar/conflicts";
import { parseIcsCalendar } from "@/src/lib/calendar/ical";
import { CALENDAR_PLATFORM_LABELS, CALENDAR_PLATFORMS, type CalendarPlatform, type CalendarSyncResult } from "@/src/lib/calendar/types";
import { validateCalendarFeedUrl } from "@/src/lib/calendar/validation";
import type { Database } from "@/src/lib/supabase/types";

const MAX_FEED_BYTES = 2 * 1024 * 1024;
const SYNC_TIMEOUT_MS = 10_000;

type Connection = Database["public"]["Tables"]["calendar_connections"]["Row"];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The calendar feed could not be synced.";
}

async function fetchCalendarFeed(url: string) {
  const validation = validateCalendarFeedUrl(url);
  if (!validation.ok) throw new Error(validation.message);
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "text/calendar,text/plain;q=0.9,*/*;q=0.1", "user-agent": "SerenityCalendarSync/1.0" },
    signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`The calendar provider returned HTTP ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FEED_BYTES) throw new Error("The calendar feed is larger than the 2 MB safety limit.");
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_FEED_BYTES) throw new Error("The calendar feed is larger than the 2 MB safety limit.");
  return body;
}

async function markConnectionError(supabase: ReturnType<typeof createSupabaseAdminClient>, connection: Connection, message: string) {
  const cleanMessage = message.slice(0, 1000);
  await supabase.from("calendar_connections").update({
    last_synced_at: new Date().toISOString(),
    last_error: cleanMessage,
    sync_status: "error",
  }).eq("id", connection.id);
  return {
    propertyId: connection.property_id,
    platform: connection.platform as CalendarPlatform,
    status: "error" as const,
    importedEvents: 0,
    message: cleanMessage,
  };
}

async function syncConnection(supabase: ReturnType<typeof createSupabaseAdminClient>, connection: Connection): Promise<CalendarSyncResult> {
  if (!connection.external_calendar_url) return markConnectionError(supabase, connection, "No iCal feed URL is configured.");
  await supabase.from("calendar_connections").update({ sync_status: "pending", last_error: "" }).eq("id", connection.id);

  try {
    const parsedEvents = parseIcsCalendar(await fetchCalendarFeed(connection.external_calendar_url));
    const now = new Date().toISOString();
    const eventRows = parsedEvents.map((event) => ({
      property_id: connection.property_id,
      connection_id: connection.id,
      source_platform: connection.platform,
      external_event_id: event.externalEventId,
      start_date: event.startDate,
      end_date: event.endDate,
      status: event.status,
      summary: `${CALENDAR_PLATFORM_LABELS[connection.platform as CalendarPlatform]} reservation`,
      is_blocking: event.isBlocking,
      last_seen_at: now,
    }));

    if (eventRows.length) {
      const { error } = await supabase.from("calendar_events").upsert(eventRows, { onConflict: "property_id,source_platform,external_event_id" });
      if (error) throw error;
    }

    const { data: existingEvents, error: existingError } = await supabase
      .from("calendar_events")
      .select("id, external_event_id")
      .eq("connection_id", connection.id);
    if (existingError) throw existingError;
    const seenIds = new Set(parsedEvents.map((event) => event.externalEventId));
    for (const existing of existingEvents ?? []) {
      if (!seenIds.has(existing.external_event_id)) {
        const { error } = await supabase.from("calendar_events").update({ status: "stale", is_blocking: false, last_seen_at: now }).eq("id", existing.id);
        if (error) throw error;
      }
    }

    const [{ data: activeEvents, error: activeEventsError }, { data: bookings, error: bookingsError }] = await Promise.all([
      supabase.from("calendar_events").select("start_date, end_date, source_platform").eq("property_id", connection.property_id).eq("status", "active").eq("is_blocking", true),
      supabase.from("bookings").select("check_in, checkout").eq("property_id", connection.property_id).in("booking_status", ["pending_payment", "confirmed", "corporate", "checked_in"]),
    ]);
    if (activeEventsError) throw activeEventsError;
    if (bookingsError) throw bookingsError;
    const conflict = (activeEvents ?? []).some((event) => (bookings ?? []).some((booking) => calendarRangesOverlap(event.start_date, event.end_date, booking.check_in, booking.checkout)));
    const status = conflict ? "conflict" : "success";
    const message = conflict ? "Imported availability overlaps an existing Serenity booking." : "Calendar synced successfully.";
    const { error: connectionError } = await supabase.from("calendar_connections").update({
      last_synced_at: now,
      last_success_at: now,
      last_error: conflict ? message : "",
      sync_status: status,
    }).eq("id", connection.id);
    if (connectionError) throw connectionError;

    return {
      propertyId: connection.property_id,
      platform: connection.platform as CalendarPlatform,
      status,
      importedEvents: (activeEvents ?? []).filter((event) => event.source_platform === connection.platform).length,
      message,
    };
  } catch (error) {
    return markConnectionError(supabase, connection, errorMessage(error));
  }
}

export async function syncCalendarConnections(filters?: { propertyId?: string; platform?: CalendarPlatform }) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("calendar_connections").select("*").eq("connection_type", "import").eq("is_enabled", true);
  if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters?.platform && CALENDAR_PLATFORMS.includes(filters.platform)) query = query.eq("platform", filters.platform);
  const { data, error } = await query.order("property_id").order("platform");
  if (error) throw error;

  const results: CalendarSyncResult[] = [];
  for (const connection of (data ?? []) as Connection[]) {
    results.push(await syncConnection(supabase, connection));
  }
  return results;
}
