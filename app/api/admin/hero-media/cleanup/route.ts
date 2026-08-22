import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { HERO_MEDIA_BUCKET } from "@/src/lib/heroMedia";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: { path?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid cleanup request." }, { status: 400 }); }
  const path = typeof body.path === "string" ? body.path : "";
  const prefix = `homepage/${admin.user.id}/`;
  if (!path.startsWith(prefix) || path.includes("..") || path.includes("\\")) return NextResponse.json({ error: "Invalid upload path." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { error: databaseError } = await supabase.from("homepage_hero_media").delete().eq("storage_path", path);
  if (databaseError) return NextResponse.json({ error: "Could not remove the failed media record." }, { status: 500 });
  const { error: storageError } = await supabase.storage.from(HERO_MEDIA_BUCKET).remove([path]);
  if (storageError) return NextResponse.json({ error: "Could not remove the failed media file." }, { status: 500 });
  return NextResponse.json({ cleaned: true });
}
