import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { propertyId, fileName, size, contentType, category } = await request.json();
  if (!propertyId || !fileName || !Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Images must be no larger than 5 MB." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(contentType)) return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("id", propertyId).maybeSingle();
  if (propertyError || !property) return NextResponse.json({ error: "That house could not be found." }, { status: 404 });

  const safeName = String(fileName).toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "");
  const safeCategory = String(category || "unsorted").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "unsorted";
  const path = `${propertyId}/${safeCategory}/${crypto.randomUUID()}-${safeName || "image"}`;
  const { data, error } = await supabase.storage.from("property-images").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Could not prepare image upload." }, { status: 500 });
  return NextResponse.json({ path, token: data.token });
}
