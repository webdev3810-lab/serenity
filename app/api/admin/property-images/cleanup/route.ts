import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: { propertyId?: unknown; paths?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid cleanup request." }, { status: 400 }); }
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  const paths = Array.isArray(body.paths) ? body.paths.filter((path): path is string => typeof path === "string" && path.length > 0) : [];
  if (!propertyId || !paths.length || paths.length > 10 || paths.some((path) => !path.startsWith(`${propertyId}/`) || path.includes("..") || path.includes("\\"))) {
    return NextResponse.json({ error: "Invalid image cleanup request." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error: databaseError } = await supabase.from("property_images").delete().in("storage_path", paths);
  if (databaseError) return NextResponse.json({ error: databaseError.message }, { status: 500 });
  const { error: storageError } = await supabase.storage.from("property-images").remove(paths);
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });
  return NextResponse.json({ cleaned: true });
}
