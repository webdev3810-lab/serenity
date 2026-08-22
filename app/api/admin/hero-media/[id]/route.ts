import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { HERO_MEDIA_BUCKET } from "@/src/lib/heroMedia";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid media update." }, { status: 400 }); }

  const updates: { alt_text?: string; caption?: string; active?: boolean; display_order?: number } = {};
  if (typeof body.alt_text === "string") updates.alt_text = body.alt_text.trim();
  if (typeof body.caption === "string") updates.caption = body.caption.trim();
  if (typeof body.active === "boolean") updates.active = body.active;
  if (typeof body.display_order !== "undefined") {
    const displayOrder = Number(body.display_order);
    if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 4) return NextResponse.json({ error: "Media order must be between 0 and 4." }, { status: 400 });
    updates.display_order = displayOrder;
  }
  if (typeof updates.alt_text === "string" && updates.alt_text.length > 180) return NextResponse.json({ error: "Alt text must be 180 characters or fewer." }, { status: 400 });
  if (typeof updates.caption === "string" && updates.caption.length > 180) return NextResponse.json({ error: "Caption must be 180 characters or fewer." }, { status: 400 });
  if (!Object.keys(updates).length) return NextResponse.json({ error: "No media changes supplied." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("homepage_hero_media").update(updates).eq("id", id).select("id, storage_path, public_url, media_type, mime_type, file_size, alt_text, caption, display_order, active, created_at, updated_at").single();
  if (error || !data) return NextResponse.json({ error: "Could not update hero media." }, { status: 500 });
  return NextResponse.json({ media: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: media, error: findError } = await supabase.from("homepage_hero_media").select("id, storage_path").eq("id", id).maybeSingle();
  if (findError || !media) return NextResponse.json({ error: "Hero media was not found." }, { status: 404 });
  const { error: storageError } = await supabase.storage.from(HERO_MEDIA_BUCKET).remove([media.storage_path]);
  if (storageError) return NextResponse.json({ error: "The file could not be removed from Storage." }, { status: 500 });
  const { error: deleteError } = await supabase.from("homepage_hero_media").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: "The file was removed from Storage but its database record could not be deleted." }, { status: 500 });
  const { data: remaining } = await supabase.from("homepage_hero_media").select("id").order("display_order", { ascending: true }).order("created_at", { ascending: true });
  if (remaining?.length) {
    await Promise.all(remaining.map((item, index) => supabase.from("homepage_hero_media").update({ display_order: index }).eq("id", item.id)));
  }
  return NextResponse.json({ deleted: true });
}
