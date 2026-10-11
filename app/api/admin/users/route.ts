import { fetchAllAdminRows } from "@/src/lib/admin-pagination";
import { NextResponse } from "next/server";
import { getSuperAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { parseNewAdminUser } from "@/src/lib/adminUserCreation";

export async function GET() {
  const current = await getSuperAdminUser();
  if (!current) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await fetchAllAdminRows(() => supabase.from("admin_users").select("user_id, email, role, active, created_at").order("created_at", { ascending: true }).order("user_id"));
  if (error) return NextResponse.json({ error: "Could not load admin users." }, { status: 500 });
  const users = await Promise.all((data ?? []).map(async (admin) => {
    const { data: authData } = await supabase.auth.admin.getUserById(admin.user_id);
    const username = authData.user?.user_metadata?.username;
    return { ...admin, username: typeof username === "string" ? username : "" };
  }));
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const current = await getSuperAdminUser();
  if (!current) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = parseNewAdminUser(body);
  if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { email, username, password, role } = parsed.value;

  const supabase = createSupabaseAdminClient();
  const { data: existingAdmin, error: existingError } = await supabase.from("admin_users").select("user_id").eq("email", email).maybeSingle();
  if (existingError) return NextResponse.json({ error: "Could not verify the email address." }, { status: 500 });
  if (existingAdmin) return NextResponse.json({ error: "That user is already an admin." }, { status: 409 });
  const { data: created, error: createError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
  if (createError || !created.user) return NextResponse.json({ error: "Could not create the account. The email may already be registered." }, { status: 400 });

  const { data, error } = await supabase.from("admin_users").insert({ user_id: created.user.id, email, role, active: true }).select("user_id, email, role, active, created_at").single();
  if (error) {
    const { error: rollbackError } = await supabase.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: rollbackError ? "Account created without admin access. Remove it from Supabase Auth before retrying." : "Could not assign admin access. No account was kept." }, { status: 500 });
  }
  return NextResponse.json({ user: { ...data, username } }, { status: 201 });
}
