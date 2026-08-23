import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { ACTIVE_BOOKING_STATUSES } from "@/src/lib/calendar/conflicts";

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
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json() as { startDate?: string; endDate?: string; blockReason?: string; internalNote?: string };
    const startDate = body.startDate?.trim() ?? "";
    const endDate = body.endDate?.trim() ?? "";
    const blockReason = body.blockReason as (typeof BLOCK_REASONS)[number] | undefined;
    const internalNote = body.internalNote?.trim() ?? "";
    if (!isDate(startDate) || !isDate(endDate) || endDate <= startDate || !blockReason || !BLOCK_REASONS.includes(blockReason)) {
      return NextResponse.json({ error: "Choose a valid reason and a date range ending after it starts." }, { status: 400 });
    }
    if (internalNote.length > 1000) return NextResponse.json({ error: "Internal notes must be 1,000 characters or fewer." }, { status: 400 });
    const supabase = createSupabaseAdminClient();
    const { data: existing, error: readError } = await supabase.from("calendar_events").select("id, property_id").eq("id", id).eq("source_platform", "direct").is("connection_id", null).maybeSingle();
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Manual block not found." }, { status: 404 });
    const { data: conflicts, error: conflictError } = await supabase.from("bookings").select("reference, check_in, checkout").eq("property_id", existing.property_id).in("booking_status", [...ACTIVE_BOOKING_STATUSES]).lt("check_in", endDate).gt("checkout", startDate);
    if (conflictError) return NextResponse.json({ error: conflictError.message }, { status: 500 });
    if (conflicts?.length) return NextResponse.json({ error: "These dates overlap an existing Serenity booking. The booking and manual block were not changed.", conflicts }, { status: 409 });
    const { data, error } = await supabase.from("calendar_events").update({
      start_date: startDate,
      end_date: endDate,
      summary: BLOCK_LABELS[blockReason],
      block_reason: blockReason,
      internal_note: internalNote,
      status: "active",
      is_blocking: true,
      last_seen_at: new Date().toISOString(),
    }).eq("id", id).eq("source_platform", "direct").is("connection_id", null).select("id, start_date, end_date, summary, block_reason, internal_note").maybeSingle();
    if (error) return NextResponse.json({ error: error.code === "23P01" ? "These dates overlap an active Serenity booking." : error.message }, { status: error.code === "23P01" ? 409 : 500 });
    if (!data) return NextResponse.json({ error: "Manual block not found." }, { status: 404 });
    return NextResponse.json({ block: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update blocked dates." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("calendar_events").update({ status: "stale", is_blocking: false }).eq("id", id).eq("source_platform", "direct").is("connection_id", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
