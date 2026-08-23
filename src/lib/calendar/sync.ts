import "server-only";

import { lookup } from "node:dns/promises";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { calendarRangesOverlap } from "@/src/lib/calendar/conflicts";
import { isIcsCalendarText, parseIcsCalendar } from "@/src/lib/calendar/ical";
import { CALENDAR_PLATFORM_LABELS, CALENDAR_PLATFORMS, type CalendarPlatform, type CalendarSyncResult } from "@/src/lib/calendar/types";
import { isBlockedCalendarHostname, validateCalendarFeedUrl } from "@/src/lib/calendar/validation";
import type { Database } from "@/src/lib/supabase/types";

const MAX_FEED_BYTES = 2 * 1024 * 1024;
const SYNC_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

type Connection = Database["public"]["Tables"]["calendar_connections"]["Row"];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The calendar feed could not be synced.";
}

async function assertPublicCalendarHost(url: URL) {
  if (isBlockedCalendarHostname(url.hostname)) throw new Error("This calendar host is not allowed.");
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("The calendar host could not be resolved.");
  }
  if (!addresses.length || addresses.some(({ address }) => isBlockedCalendarHostname(address))) {
    throw new Error("This calendar host resolves to a private or reserved network address.");
  }
}

export async function fetchCalendarFeed(url: string) {
  const validation = validateCalendarFeedUrl(url);
  if (!validation.ok) throw new Error(validation.message);
  let currentUrl = new URL(validation.normalizedUrl);
  let response: Response | null = null;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertPublicCalendarHost(currentUrl);
    response = await fetch(currentUrl, {
      cache: "no-store",
      redirect: "manual",
      headers: { accept: "text/calendar,text/plain;q=0.9,application/octet-stream;q=0.8,*/*;q=0.1", "user-agent": "SerenityCalendarSync/1.0" },
      signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    if (redirectCount === MAX_REDIRECTS) throw new Error("The calendar feed redirected too many times.");
    const location = response.headers.get("location");
    if (!location) throw new Error("The calendar provider returned an invalid redirect.");
    const redirected = new URL(location, currentUrl);
    const redirectValidation = validateCalendarFeedUrl(redirected.toString());
    if (!redirectValidation.ok) throw new Error(redirectValidation.message);
    currentUrl = new URL(redirectValidation.normalizedUrl);
  }
  if (!response) throw new Error("The calendar provider did not return a response.");
  if (!response.ok) throw new Error(`The calendar provider returned HTTP ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FEED_BYTES) throw new Error("The calendar feed is larger than the 2 MB safety limit.");
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_FEED_BYTES) throw new Error("The calendar feed is larger than the 2 MB safety limit.");
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("text/html") || !isIcsCalendarText(body)) {
    throw new Error("The supplied URL returned a webpage or non-calendar file instead of valid iCal data.");
  }
  return body;
}

export async function testCalendarFeed(url: string) {
  const validation = validateCalendarFeedUrl(url);
  if (!validation.ok) throw new Error(validation.message);
  const events = parseIcsCalendar(await fetchCalendarFeed(validation.normalizedUrl));
  const eventCount = events.filter((event) => event.status === "active" && event.isBlocking).length;
  return {
    normalizedUrl: validation.normalizedUrl,
    eventCount,
    status: eventCount ? "connected" as const : "no_events" as const,
    message: eventCount ? "Valid iCal feed connected." : "Valid iCal feed connected; no blocking events were found.",
  };
}

async function markConnectionError(supabase: ReturnType<typeof createSupabaseAdminClient>, connection: Connection, message: string) {
  const cleanMessage = message.slice(0, 1000);
  await supabase.from("calendar_connections").update({
    last_synced_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString(),
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
  const attemptedAt = new Date().toISOString();
  await supabase.from("calendar_connections").update({ sync_status: "pending", last_error: "", last_attempt_at: attemptedAt, last_synced_at: attemptedAt }).eq("id", connection.id);

  try {
    const parsedEvents = parseIcsCalendar(await fetchCalendarFeed(connection.external_calendar_url));
    const now = new Date().toISOString();
    const { data: bookings, error: bookingsError } = await supabase.from("bookings").select("check_in, checkout").eq("property_id", connection.property_id).in("booking_status", ["pending_payment", "confirmed", "corporate", "checked_in"]);
    if (bookingsError) throw bookingsError;
    const conflictingEventIds = new Set(parsedEvents
      .filter((event) => event.status === "active" && event.isBlocking)
      .filter((event) => (bookings ?? []).some((booking) => calendarRangesOverlap(event.startDate, event.endDate, booking.check_in, booking.checkout)))
      .map((event) => event.externalEventId));
    const eventRows = parsedEvents.map((event) => ({
      property_id: connection.property_id,
      connection_id: connection.id,
      source_platform: connection.platform,
      external_event_id: event.externalEventId,
      start_date: event.startDate,
      end_date: event.endDate,
      status: event.status,
      summary: `${CALENDAR_PLATFORM_LABELS[connection.platform as CalendarPlatform]} reservation`,
      // Keep a conflicting imported event for admin visibility, but do not let
      // it overwrite or prevent confirmation of the existing Serenity hold.
      is_blocking: event.isBlocking && !conflictingEventIds.has(event.externalEventId),
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

    const conflict = conflictingEventIds.size > 0;
    const status = conflict ? "conflict" : "success";
    const importedEventCount = parsedEvents.filter((event) => event.status === "active" && event.isBlocking).reduce((count, event) => count + Math.max(0, Math.round((new Date(`${event.endDate}T00:00:00Z`).getTime() - new Date(`${event.startDate}T00:00:00Z`).getTime()) / 86_400_000)), 0);
    const message = conflict
      ? "Imported availability overlaps an existing Serenity booking."
      : importedEventCount
        ? "Calendar synced successfully."
        : "Calendar connected; no blocking events were found.";
    const { error: connectionError } = await supabase.from("calendar_connections").update({
      last_synced_at: now,
      last_attempt_at: attemptedAt,
      last_success_at: now,
      last_error: conflict ? message : "",
      last_imported_event_count: importedEventCount,
      sync_status: status,
    }).eq("id", connection.id);
    if (connectionError) throw connectionError;

    return {
      propertyId: connection.property_id,
      platform: connection.platform as CalendarPlatform,
      status,
      importedEvents: importedEventCount,
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
