import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { syncCalendarConnections } from "@/src/lib/calendar/sync";
import { CALENDAR_PLATFORMS, type CalendarPlatform } from "@/src/lib/calendar/types";

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { propertyId?: string; platform?: string };
    const platform = body.platform && CALENDAR_PLATFORMS.includes(body.platform as CalendarPlatform) ? body.platform as CalendarPlatform : undefined;
    const results = await syncCalendarConnections({ propertyId: body.propertyId?.trim() || undefined, platform });
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not sync calendars." }, { status: 500 });
  }
}
