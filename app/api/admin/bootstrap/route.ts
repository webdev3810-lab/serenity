import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const genericError = "We could not create the first admin account. Check the details and try again.";

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Admin setup is not configured yet." }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: genericError }, { status: 400 }); }
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return NextResponse.json({ error: "Enter a valid email and a password with at least 8 characters." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { count, error: countError } = await supabase.from("admin_users").select("user_id", { count: "exact", head: true });
  if (countError) return NextResponse.json({ error: genericError }, { status: 500 });
  if ((count ?? 0) > 0) return NextResponse.json({ error: "First-admin setup is no longer available." }, { status: 409 });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !created.user) return NextResponse.json({ error: genericError }, { status: 400 });

  const { data: claimed, error: claimError } = await supabase.rpc("claim_first_admin", { p_user_id: created.user.id, p_email: email });
  if (claimError || !claimed) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: claimed === false ? "First-admin setup is no longer available." : genericError }, { status: claimed === false ? 409 : 500 });
  }

  return NextResponse.json({ created: true });
}
