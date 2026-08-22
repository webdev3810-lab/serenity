import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function GET() {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ configured: false, canRegister: false });
  }

  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase.from("admin_users").select("user_id", { count: "exact", head: true });
  if (error) return NextResponse.json({ error: "Admin setup is temporarily unavailable." }, { status: 503 });
  return NextResponse.json({ configured: true, canRegister: (count ?? 0) === 0 });
}
