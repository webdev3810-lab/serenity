import { NextResponse } from "next/server";
import { HERO_IMAGE_MAX_BYTES, HERO_IMAGE_TYPES, HERO_MEDIA_BUCKET, safeHeroMediaName } from "@/src/lib/heroMedia";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAdminUser } from "@/src/lib/supabase/auth";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid upload request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  const type = typeof body.contentType === "string" ? body.contentType : "";
  const size = Number(body.size);
  if (!(HERO_IMAGE_TYPES as readonly string[]).includes(type) || !Number.isFinite(size) || size <= 0 || size > HERO_IMAGE_MAX_BYTES || typeof body.fileName !== "string") {
    return NextResponse.json({ error: "Choose a JPG, PNG, WebP or AVIF image up to 5 MB." }, { status: 400 });
  }
  const path = `guest-information/${admin.user.id}/${crypto.randomUUID()}-${safeHeroMediaName(body.fileName, type)}`;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(HERO_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Could not prepare the image upload. Please retry." }, { status: 500 });
  return NextResponse.json({ path, token: data.token });
}
