import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const BLOCK_TYPES = ["blocked", "maintenance", "preparation"] as const;

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  try {
    const body = await request.json() as { propertyId?: string; startDate?: string; endDate?: string; blockType?: string };
    const propertyId = body.propertyId?.trim() ?? "";
    const startDate = body.startDate?.trim() ?? "";
    const endDate = body.endDate?.trim() ?? "";
    const blockType = body.blockType as (typeof BLOCK_TYPES)[number] | undefined;
    if (!propertyId || !isDate(startDate) || !isDate(endDate) || endDate <= startDate || !blockType || !BLOCK_TYPES.includes(blockType)) {
      return NextResponse.json({ error: "Choose a valid property and a date range ending after it starts." }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { data: property } = await supabase.from("properties").select("id").eq("id", propertyId).maybeSingle();
    if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });
    const blockId = crypto.randomUUID();
    const labels = { blocked: "Unavailable", maintenance: "Maintenance", preparation: "Preparation" };
    const { data, error } = await supabase.from("calendar_events").insert({
      property_id: propertyId,
      connection_id: null,
      source_platform: "direct",
      external_event_id: `admin-block:${blockId}`,
      start_date: startDate,
      end_date: endDate,
      status: "active",
      summary: labels[blockType],
      is_blocking: true,
      last_seen_at: new Date().toISOString(),
    }).select("id, start_date, end_date, summary").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ block: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create blocked dates." }, { status: 500 });
  }
}
