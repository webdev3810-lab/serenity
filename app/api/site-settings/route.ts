import { NextResponse } from "next/server";
import { getPublicPromoSettings } from "@/src/lib/supabase/content";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getPublicPromoSettings();
  return NextResponse.json(settings, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
