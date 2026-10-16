import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type CompleteBody = {
  propertyId?: unknown;
  path?: unknown;
  originalFilename?: unknown;
  category?: unknown;
  categoryLabel?: unknown;
  size?: unknown;
  width?: unknown;
  height?: unknown;
  replaceFloorPlanId?: unknown;
};

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: CompleteBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid image completion request." }, { status: 400 });
  }

  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  const path = typeof body.path === "string" ? body.path : "";
  const size = Number(body.size);
  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim() : "unsorted";
  const categoryLabel = typeof body.categoryLabel === "string" && body.categoryLabel.trim() ? body.categoryLabel.trim() : "Unsorted uploads";
  const originalFilename = typeof body.originalFilename === "string" ? body.originalFilename.trim().slice(0, 255) : "image";
  const replaceFloorPlanId = typeof body.replaceFloorPlanId === "string" ? body.replaceFloorPlanId : "";

  if (!propertyId || !path || !Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Images must be no larger than 5 MB." }, { status: 400 });
  }
  if (!path.startsWith(`${propertyId}/`) || path.includes("..") || path.includes("\\")) {
    return NextResponse.json({ error: "Invalid image upload path." }, { status: 400 });
  }
  if (replaceFloorPlanId && category !== "floor-plan") {
    return NextResponse.json({ error: "Only a floor plan can be replaced through this upload." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: property, error: propertyError } = await supabase.from("properties").select("id, name").eq("id", propertyId).maybeSingle();
  if (propertyError || !property) return NextResponse.json({ error: "That house could not be found." }, { status: 404 });

  const { data: objectInfo, error: objectError } = await supabase.storage.from("property-images").info(path);
  const objectMetadata = objectInfo as Record<string, unknown> | null;
  const actualSize = Number(objectMetadata?.size);
  const mimeType = String(objectMetadata?.contentType ?? objectMetadata?.mimetype ?? "image/webp").toLowerCase();
  if (objectError || !objectMetadata || !ALLOWED_TYPES.has(mimeType) || !Number.isFinite(actualSize) || actualSize <= 0 || actualSize > MAX_IMAGE_BYTES || actualSize !== size) {
    await supabase.storage.from("property-images").remove([path]);
    return NextResponse.json({ error: "The uploaded image could not be verified." }, { status: 400 });
  }

  if (category === "floor-plan") {
    const { data: existing, error: existingError } = await supabase.from("property_images").select("id, storage_path").eq("property_id", propertyId).eq("category", "floor-plan").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existingError || (existing && existing.id !== replaceFloorPlanId) || (!existing && replaceFloorPlanId)) {
      await supabase.storage.from("property-images").remove([path]);
      return NextResponse.json({ error: existingError?.message || "The floor plan changed while you were uploading. Refresh and try again." }, { status: existingError ? 500 : 409 });
    }

    if (existing) {
      const { data: updated, error: updateError } = await supabase.from("property_images").update({
        storage_path: path,
        external_url: null,
        alt_text: `${property.name} floor plan`,
        original_filename: originalFilename,
        file_size: actualSize,
        mime_type: mimeType,
        width: Number.isFinite(Number(body.width)) ? Number(body.width) : null,
        height: Number.isFinite(Number(body.height)) ? Number(body.height) : null,
        is_cover: false,
        is_visible: true,
        is_placeholder: false,
      }).eq("id", existing.id).eq("property_id", propertyId).eq("category", "floor-plan").select("*").single();
      if (updateError || !updated) {
        await supabase.storage.from("property-images").remove([path]);
        return NextResponse.json({ error: updateError?.message || "Could not replace the floor plan." }, { status: 500 });
      }
      const { error: cleanupError } = existing.storage_path && existing.storage_path !== path
        ? await supabase.storage.from("property-images").remove([existing.storage_path])
        : { error: null };
      return NextResponse.json({ image: updated, warning: cleanupError ? "The old floor plan file could not be removed from storage." : undefined });
    }
  }

  const { data, error } = await supabase.from("property_images").insert({
    property_id: propertyId,
    storage_path: path,
    alt_text: category === "floor-plan" ? `${property.name} floor plan` : originalFilename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 220),
    original_filename: originalFilename,
    file_size: actualSize,
    mime_type: mimeType,
    width: Number.isFinite(Number(body.width)) ? Number(body.width) : null,
    height: Number.isFinite(Number(body.height)) ? Number(body.height) : null,
    category,
    category_label: categoryLabel.slice(0, 120),
    display_order: 0,
    is_cover: false,
    is_visible: category === "floor-plan",
    is_placeholder: false,
  }).select("*").single();

  if (error || !data) {
    await supabase.storage.from("property-images").remove([path]);
    return NextResponse.json({ error: error?.message || "The image uploaded but could not be added to the gallery." }, { status: 500 });
  }

  return NextResponse.json({ image: data });
}
