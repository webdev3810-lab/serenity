import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { fetchAllAdminRows } from "@/src/lib/admin-pagination";
import { ACTIVE_BOOKING_STATUSES, calendarRangesOverlap } from "@/src/lib/calendar/conflicts";

const BLOCK_REASONS = ["maintenance", "owner_use", "cleaning", "preparation", "renovation", "private_booking", "other"] as const;
const BLOCK_LABELS: Record<(typeof BLOCK_REASONS)[number], string> = {
  maintenance: "Maintenance",
  owner_use: "Owner use",
  cleaning: "Cleaning",
  preparation: "Preparation time",
  renovation: "Renovation",
  private_booking: "Private booking",
  other: "Unavailable",
};

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  try {
    const body = await request.json() as { propertyId?: string; startDate?: string; endDate?: string; ranges?: Array<{ propertyId?: string; startDate?: string; endDate?: string }>; blockReason?: string; internalNote?: string } | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Choose valid date ranges." }, { status: 400 });
    if (body.ranges !== undefined && !Array.isArray(body.ranges)) return NextResponse.json({ error: "Choose valid date ranges." }, { status: 400 });
    const rawRanges = body.ranges ?? [body];
    if (!rawRanges.length || rawRanges.length > 100) return NextResponse.json({ error: "Choose between 1 and 100 separate date ranges at a time." }, { status: 400 });
    const ranges = rawRanges.map((range) => ({ propertyId: typeof range?.propertyId === "string" ? range.propertyId.trim() : "", startDate: typeof range?.startDate === "string" ? range.startDate.trim() : "", endDate: typeof range?.endDate === "string" ? range.endDate.trim() : "" }));
    const blockReason = body.blockReason as (typeof BLOCK_REASONS)[number] | undefined;
    const internalNote = typeof body.internalNote === "string" ? body.internalNote.trim() : "";
    if (ranges.some((range) => !range.propertyId || !isDate(range.startDate) || !isDate(range.endDate) || range.endDate <= range.startDate) || !blockReason || !BLOCK_REASONS.includes(blockReason)) {
      return NextResponse.json({ error: "Choose a valid property and a date range ending after it starts." }, { status: 400 });
    }
    if (internalNote.length > 1000) return NextResponse.json({ error: "Internal notes must be 1,000 characters or fewer." }, { status: 400 });
    const sorted = [...ranges].sort((a, b) => a.propertyId.localeCompare(b.propertyId) || a.startDate.localeCompare(b.startDate));
    if (sorted.some((range, index) => index > 0 && sorted[index - 1].propertyId === range.propertyId && sorted[index - 1].endDate > range.startDate)) {
      return NextResponse.json({ error: "The selected date ranges overlap each other." }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const propertyIds = [...new Set(sorted.map((range) => range.propertyId))];
    const { data: properties, error: propertyError } = await supabase.from("properties").select("id, unavailable_dates").in("id", propertyIds);
    if (propertyError) return NextResponse.json({ error: propertyError.message }, { status: 500 });
    if (properties?.length !== propertyIds.length) return NextResponse.json({ error: "One or more houses could not be found." }, { status: 404 });
    for (const propertyId of propertyIds) {
      const propertyRanges = sorted.filter((range) => range.propertyId === propertyId);
      const earliest = propertyRanges[0].startDate;
      const latest = propertyRanges.reduce((end, range) => end > range.endDate ? end : range.endDate, earliest);
      const property = properties.find((item) => item.id === propertyId);
      if (propertyRanges.some((range) => property?.unavailable_dates?.some((date) => date >= range.startDate && date < range.endDate))) {
        return NextResponse.json({ error: "These dates include a night already marked unavailable on a house." }, { status: 409 });
      }
      const [bookingsResult, eventsResult] = await Promise.all([
        fetchAllAdminRows(() => supabase.from("bookings").select("id, reference, check_in, checkout").eq("property_id", propertyId).in("booking_status", [...ACTIVE_BOOKING_STATUSES]).lt("check_in", latest).gt("checkout", earliest).order("check_in").order("id")),
        fetchAllAdminRows(() => supabase.from("calendar_events").select("id, source_platform, start_date, end_date, summary").eq("property_id", propertyId).eq("status", "active").eq("is_blocking", true).lt("start_date", latest).gt("end_date", earliest).order("start_date").order("id")),
      ]);
      if (bookingsResult.error || eventsResult.error) return NextResponse.json({ error: bookingsResult.error?.message ?? eventsResult.error?.message }, { status: 500 });
      const conflictingBookings = bookingsResult.data?.filter((booking) => propertyRanges.some((range) => calendarRangesOverlap(range.startDate, range.endDate, booking.check_in, booking.checkout))) ?? [];
      if (conflictingBookings.length) return NextResponse.json({ error: "These dates overlap an existing Serenity booking. No blocks were saved.", conflicts: conflictingBookings }, { status: 409 });
      const conflictingEvents = eventsResult.data?.filter((event) => propertyRanges.some((range) => calendarRangesOverlap(range.startDate, range.endDate, event.start_date, event.end_date))) ?? [];
      if (conflictingEvents.length) return NextResponse.json({ error: "These dates overlap an existing calendar block or imported calendar event. No blocks were saved.", conflicts: conflictingEvents }, { status: 409 });
    }
    const rows = sorted.map((range) => ({
      property_id: range.propertyId,
      connection_id: null,
      source_platform: "direct" as const,
      external_event_id: `admin-block:${crypto.randomUUID()}`,
      start_date: range.startDate,
      end_date: range.endDate,
      status: "active" as const,
      summary: BLOCK_LABELS[blockReason],
      block_reason: blockReason,
      internal_note: internalNote,
      is_blocking: true,
      last_seen_at: new Date().toISOString(),
    }));
    const { data, error } = await supabase.from("calendar_events").insert(rows).select("id, property_id, start_date, end_date, summary, block_reason, internal_note");
    if (error) return NextResponse.json({ error: error.code === "23P01" ? "These dates overlap an active Serenity booking." : error.message }, { status: error.code === "23P01" ? 409 : 500 });
    return NextResponse.json({ block: data?.[0] ?? null, blocks: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create blocked dates." }, { status: 500 });
  }
}
