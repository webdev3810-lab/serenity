import { NextResponse } from "next/server";
import { getPublicPropertyBySlug } from "@/src/lib/supabase/content";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });
  return NextResponse.json(property, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
