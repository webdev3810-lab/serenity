import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { HERO_MEDIA_BUCKET, HERO_MEDIA_MAX_ITEMS, heroMediaKind, safeHeroMediaName, validateHeroMediaFile } from "@/src/lib/heroMedia";

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
  const validationError = validateHeroMediaFile({ contentType, size: body.size });
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (typeof body.fileName !== "string" || !body.fileName.trim()) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { count, error: countError } = await supabase.from("homepage_hero_media").select("id", { count: "exact", head: true });
  if (countError) return NextResponse.json({ error: "Could not check the hero media limit." }, { status: 500 });
  if ((count ?? 0) >= HERO_MEDIA_MAX_ITEMS) return NextResponse.json({ error: "You can publish a maximum of five hero media items." }, { status: 400 });

  const path = `homepage/${admin.user.id}/${crypto.randomUUID()}-${safeHeroMediaName(body.fileName, contentType)}`;
  const { data, error } = await supabase.storage.from(HERO_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Could not prepare the direct upload." }, { status: 500 });

  return NextResponse.json({
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    mediaType: heroMediaKind(contentType),
  });
}
