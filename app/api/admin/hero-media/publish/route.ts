import { NextResponse } from "next/server";
import { getAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export async function POST() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("homepage_hero_media").update({ active: true }).not("id", "is", null);
  if (error) return NextResponse.json({ error: "Could not publish hero media." }, { status: 500 });
  return NextResponse.json({ published: true });
}
