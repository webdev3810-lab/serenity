import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { HERO_IMAGE_MAX_BYTES, HERO_IMAGE_TYPES, safeHeroMediaName } from "@/src/lib/heroMedia";

const INTRO_MEDIA_BUCKET = "property-images";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: { fileName?: unknown; size?: unknown; contentType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const contentType = typeof body.contentType === "string" ? body.contentType.toLowerCase() : "";
  const size = Number(body.size);
  if (!(HERO_IMAGE_TYPES as readonly string[]).includes(contentType)) {
    return NextResponse.json({ error: "Use a JPG, PNG, WebP, or AVIF image." }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > HERO_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Intro images must be no larger than 5 MB." }, { status: 400 });
  }
  if (typeof body.fileName !== "string" || !body.fileName.trim()) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }

  const path = `homepage-intro/${admin.user.id}/${crypto.randomUUID()}-${safeHeroMediaName(body.fileName, contentType)}`;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(INTRO_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Could not prepare the intro image upload." }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from(INTRO_MEDIA_BUCKET).getPublicUrl(path);
  return NextResponse.json({ path, token: data.token, publicUrl: publicUrl.publicUrl });
}
