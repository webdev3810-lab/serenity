import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { GUEST_IMAGE_SLOTS, GUEST_INFORMATION_PAGE_KEY, normalizeGuestInformation, validateGuestInformation } from "@/src/lib/guestInformation";
import { HERO_IMAGE_MAX_BYTES, HERO_IMAGE_TYPES, HERO_MEDIA_BUCKET } from "@/src/lib/heroMedia";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { getGuestAutomaticImages, guestImagePreviews } from "@/src/lib/supabase/guestInformation";

export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("homepage_content").select("content, updated_at").eq("page_key", GUEST_INFORMATION_PAGE_KEY).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load the guest guide. Please retry." }, { status: 500 });
  const content = normalizeGuestInformation(data?.content);
  try {
    const [previews, automaticImages] = await Promise.all([guestImagePreviews(content), getGuestAutomaticImages()]);
    return NextResponse.json({ content, revision: data?.updated_at ?? null, previews, automaticImages }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load the saved images. Please retry." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid guest information." }, { status: 400 }); }
  if (!body?.content || typeof body.content !== "object" || Array.isArray(body.content)) return NextResponse.json({ error: "Invalid guest information." }, { status: 400 });
  if (body.revision !== null && (typeof body.revision !== "string" || !Number.isFinite(Date.parse(body.revision)))) return NextResponse.json({ error: "Reload the saved guide before publishing." }, { status: 400 });
  const content = normalizeGuestInformation(body.content);
  const errors = validateGuestInformation(content);
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  for (const slot of GUEST_IMAGE_SLOTS) {
    const image = content.images[slot];
    if (image.mode !== "custom" || !image.storagePath) continue;
    const { data, error } = await supabase.storage.from(HERO_MEDIA_BUCKET).info(image.storagePath);
    const info = data as Record<string, unknown> | null;
    const type = String(info?.contentType ?? info?.mimetype ?? "");
    const size = Number(info?.size);
    if (error || !(HERO_IMAGE_TYPES as readonly string[]).includes(type) || !Number.isFinite(size) || size <= 0 || size > HERO_IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: `The ${slot} image could not be verified. Upload it again before publishing.` }, { status: 400 });
    }
  }
  const payload = { content, published: true };
  const result = body.revision
    ? await supabase.from("homepage_content").update(payload).eq("page_key", GUEST_INFORMATION_PAGE_KEY).eq("updated_at", body.revision).select("updated_at").maybeSingle()
    : await supabase.from("homepage_content").insert({ page_key: GUEST_INFORMATION_PAGE_KEY, ...payload }).select("updated_at").single();
  if (result.error?.code === "23505" || (!result.error && !result.data)) return NextResponse.json({ error: "This guide was updated in another session. Reload the editor before publishing." }, { status: 409 });
  if (result.error) return NextResponse.json({ error: "Could not publish guest information. Your edits are still in the editor." }, { status: 500 });
  revalidatePath("/guest-information");
  return NextResponse.json({ content, revision: result.data?.updated_at });
}
