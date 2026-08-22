import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { HERO_MEDIA_BUCKET, HERO_MEDIA_MAX_ITEMS, heroMediaKind, validateHeroMediaFile } from "@/src/lib/heroMedia";

type CompleteBody = { path?: unknown; contentType?: unknown; size?: unknown; altText?: unknown; caption?: unknown };

const cleanup = async (supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, path: string) => {
  await supabase.storage.from(HERO_MEDIA_BUCKET).remove([path]);
};

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: CompleteBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid upload completion request." }, { status: 400 });
  }

  const path = typeof body.path === "string" ? body.path : "";
  const contentType = typeof body.contentType === "string" ? body.contentType.toLowerCase() : "";
  const declaredSize = Number(body.size);
  const expectedPrefix = `homepage/${admin.user.id}/`;
  const validationError = validateHeroMediaFile({ contentType, size: declaredSize });
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (!path.startsWith(expectedPrefix) || path.includes("..") || path.includes("\\")) return NextResponse.json({ error: "Invalid upload path." }, { status: 400 });
  if (typeof body.altText !== "undefined" && String(body.altText).length > 180) return NextResponse.json({ error: "Alt text must be 180 characters or fewer." }, { status: 400 });
  if (typeof body.caption !== "undefined" && String(body.caption).length > 180) return NextResponse.json({ error: "Caption must be 180 characters or fewer." }, { status: 400 });
  const mediaType = heroMediaKind(contentType);
  if (!mediaType) return NextResponse.json({ error: "Unsupported media type." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { count, error: countError } = await supabase.from("homepage_hero_media").select("id", { count: "exact", head: true });
  if (countError) return NextResponse.json({ error: "Could not check the hero media limit." }, { status: 500 });
  if ((count ?? 0) >= HERO_MEDIA_MAX_ITEMS) {
    await cleanup(supabase, path);
    return NextResponse.json({ error: "You can publish a maximum of five hero media items." }, { status: 400 });
  }

  const { data: objectInfo, error: objectError } = await supabase.storage.from(HERO_MEDIA_BUCKET).info(path);
  const actualSize = Number((objectInfo as Record<string, unknown> | null)?.size);
  const actualMimeType = String((objectInfo as Record<string, unknown> | null)?.contentType ?? (objectInfo as Record<string, unknown> | null)?.mimetype ?? contentType).toLowerCase();
  const actualValidationError = validateHeroMediaFile({ contentType: actualMimeType, size: actualSize });
  if (objectError || actualValidationError || actualSize !== declaredSize || actualMimeType !== contentType) {
    await cleanup(supabase, path);
    return NextResponse.json({ error: actualValidationError || "The uploaded file metadata did not pass server validation." }, { status: 400 });
  }

  const { data: publicUrl } = supabase.storage.from(HERO_MEDIA_BUCKET).getPublicUrl(path);
  const { data, error } = await supabase
    .from("homepage_hero_media")
    .insert({
      storage_path: path,
      public_url: publicUrl.publicUrl,
      media_type: mediaType,
      mime_type: contentType,
      file_size: actualSize,
      alt_text: String(body.altText ?? "").trim(),
      caption: String(body.caption ?? "").trim(),
      display_order: count ?? 0,
      active: false,
    })
    .select("id, storage_path, public_url, media_type, mime_type, file_size, alt_text, caption, display_order, active, created_at, updated_at")
    .single();
  if (error || !data) {
    await cleanup(supabase, path);
    return NextResponse.json({ error: "The media uploaded but could not be published in the hero." }, { status: 500 });
  }
  const { data: signedUrl } = await supabase.storage.from(HERO_MEDIA_BUCKET).createSignedUrl(path, 3600);
  return NextResponse.json({ media: { ...data, preview_url: signedUrl?.signedUrl ?? "" } });
}
