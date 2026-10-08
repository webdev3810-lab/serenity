import { NextResponse } from "next/server";
import { ICS_UPLOAD_PREFIX } from "@/src/lib/calendar/ical";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

// Only retained to clear blocks created by the former file-upload flow.
export async function DELETE(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  const propertyId = new URL(request.url).searchParams.get("propertyId") ?? "";
  if (!propertyId) return NextResponse.json({ error: "Choose a house." }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("calendar_events")
    .update({ status: "stale", is_blocking: false })
    .eq("property_id", propertyId)
    .eq("source_platform", "direct")
    .like("external_event_id", `${ICS_UPLOAD_PREFIX}%`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
