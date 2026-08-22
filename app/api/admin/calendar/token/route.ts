import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { generateCalendarToken, hashCalendarToken } from "@/src/lib/calendar/security";

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  try {
    const body = await request.json() as { propertyId?: string };
    const propertyId = body.propertyId?.trim();
    if (!propertyId) return NextResponse.json({ error: "A property is required." }, { status: 400 });
    const supabase = createSupabaseAdminClient();
    const { data: property, error: propertyError } = await supabase.from("properties").select("id, slug").eq("id", propertyId).maybeSingle();
    if (propertyError) return NextResponse.json({ error: propertyError.message }, { status: 500 });
    if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });

    const token = generateCalendarToken();
    const { error } = await supabase.from("calendar_connections").upsert({
      property_id: property.id,
      platform: "direct",
      connection_type: "export",
      export_token_hash: hashCalendarToken(token),
      external_calendar_url: null,
      is_enabled: true,
      last_error: "",
      sync_status: "success",
    }, { onConflict: "property_id,platform,connection_type" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const url = `${siteOrigin}/api/calendar/${encodeURIComponent(property.slug)}.ics?token=${encodeURIComponent(token)}`;
    return NextResponse.json({ url, warning: "This secure link is shown once. Generate a new link if it is lost or exposed." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create calendar link." }, { status: 500 });
  }
}
