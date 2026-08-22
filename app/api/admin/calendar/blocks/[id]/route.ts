import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("calendar_events").update({ status: "stale", is_blocking: false }).eq("id", id).eq("source_platform", "direct").is("connection_id", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
