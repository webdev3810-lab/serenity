import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { testCalendarFeed } from "@/src/lib/calendar/sync";

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "You must be signed in as an admin." }, { status: 401 });
  try {
    const body = await request.json() as { externalUrl?: string };
    const result = await testCalendarFeed(body.externalUrl ?? "");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      status: "invalid_url",
      error: error instanceof Error ? error.message : "The calendar connection test failed.",
    }, { status: 400 });
  }
}
