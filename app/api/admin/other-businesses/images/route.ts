import { NextResponse } from "next/server";
import { HERO_IMAGE_MAX_BYTES, HERO_IMAGE_TYPES, safeHeroMediaName } from "@/src/lib/heroMedia";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAdminUser } from "@/src/lib/supabase/auth";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  let body: { fileName?: unknown; contentType?: unknown; size?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid upload request." }, { status: 400 }); }
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const size = Number(body?.size);
  if (typeof body?.fileName !== "string" || !(HERO_IMAGE_TYPES as readonly string[]).includes(contentType) || !Number.isFinite(size) || size <= 0 || size > HERO_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Choose a JPG, PNG, WebP or AVIF image up to 5 MB." }, { status: 400 });
  }
  const path = `other-businesses/${admin.user.id}/${crypto.randomUUID()}-${safeHeroMediaName(body.fileName, contentType)}`;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from("property-images").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Could not prepare image upload." }, { status: 500 });
  const publicUrl = supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ path, token: data.token, publicUrl });
}
