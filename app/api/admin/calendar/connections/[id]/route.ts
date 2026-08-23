import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json() as { isEnabled?: boolean };
    if (typeof body.isEnabled !== "boolean") return NextResponse.json({ error: "Choose whether the connection is enabled." }, { status: 400 });
    const supabase = createSupabaseAdminClient();
    const { data: connection, error: readError } = await supabase.from("calendar_connections").select("id, external_calendar_url").eq("id", id).eq("connection_type", "import").maybeSingle();
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
    if (!connection) return NextResponse.json({ error: "Calendar connection not found." }, { status: 404 });
    if (body.isEnabled && !connection.external_calendar_url) return NextResponse.json({ error: "Save an external iCal URL before enabling this connection." }, { status: 400 });
    if (!body.isEnabled) {
      const { error: eventError } = await supabase.from("calendar_events").update({ status: "stale", is_blocking: false }).eq("connection_id", id);
      if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
    }
    const { error } = await supabase.from("calendar_connections").update({
      is_enabled: body.isEnabled,
      sync_status: body.isEnabled ? "pending" : "not_configured",
      last_error: "",
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, isEnabled: body.isEnabled });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update calendar connection." }, { status: 500 });
  }
}

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
