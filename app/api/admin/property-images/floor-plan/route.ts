import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type FloorPlanRequest = { propertyId?: unknown; imageId?: unknown; visible?: unknown };

async function readTarget(request: Request) {
  let body: FloorPlanRequest;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  const imageId = typeof body.imageId === "string" ? body.imageId : "";
  return propertyId && imageId ? { propertyId, imageId, visible: body.visible } : null;
}

export async function PATCH(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const target = await readTarget(request);
  if (!target || typeof target.visible !== "boolean") return NextResponse.json({ error: "Invalid floor plan update." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("property_images")
    .update({ is_visible: target.visible })
    .eq("id", target.imageId)
    .eq("property_id", target.propertyId)
    .eq("category", "floor-plan")
    .select("id, is_visible")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Floor plan not found. Refresh and try again." }, { status: 404 });
  return NextResponse.json({ image: data });
}

export async function DELETE(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const target = await readTarget(request);
  if (!target) return NextResponse.json({ error: "Invalid floor plan deletion." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: image, error: lookupError } = await supabase.from("property_images")
    .select("id, storage_path")
    .eq("id", target.imageId)
    .eq("property_id", target.propertyId)
    .eq("category", "floor-plan")
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!image) return NextResponse.json({ error: "Floor plan not found. Refresh and try again." }, { status: 404 });

  const { data: deleted, error: deleteError } = await supabase.from("property_images")
    .delete()
    .eq("id", image.id)
    .eq("property_id", target.propertyId)
    .eq("category", "floor-plan")
    .select("id");
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  if (!deleted?.length) return NextResponse.json({ error: "Floor plan not found. Refresh and try again." }, { status: 404 });

  const { error: storageError } = image.storage_path
    ? await supabase.storage.from("property-images").remove([image.storage_path])
    : { error: null };
  return NextResponse.json({ deleted: true, warning: storageError ? "The floor plan was removed, but its old file could not be deleted from storage." : undefined });
}
