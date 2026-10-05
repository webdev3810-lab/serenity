import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Promotional codes are no longer available." }, { status: 410 });
}
