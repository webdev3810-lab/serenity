import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("homepage_hero_media")
    .select("id, storage_path, public_url, media_type, mime_type, file_size, alt_text, caption, display_order, active, created_at, updated_at")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Could not load homepage hero media." }, { status: 500 });
  const rows = data ?? [];
  const signed = await Promise.all(rows.map(async (row) => {
    const { data: signedUrl } = await supabase.storage.from("hero-media").createSignedUrl(row.storage_path, 3600);
    return { ...row, preview_url: signedUrl?.signedUrl ?? "" };
  }));
  return NextResponse.json({ media: signed }, { headers: { "Cache-Control": "no-store" } });
}
