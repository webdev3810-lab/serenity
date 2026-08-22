import { NextResponse } from "next/server";
import { syncCalendarConnections } from "@/src/lib/calendar/sync";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  if (authorization !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const results = await syncCalendarConnections();
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Calendar sync failed." }, { status: 500 });
  }
}
