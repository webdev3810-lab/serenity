import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { error: eventError } = await supabase.from("calendar_events").update({ status: "stale", is_blocking: false }).eq("connection_id", id);
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
  const { error } = await supabase.from("calendar_connections").update({ is_enabled: false, external_calendar_url: null, sync_status: "not_configured", last_error: "" }).eq("id", id).eq("connection_type", "import");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
