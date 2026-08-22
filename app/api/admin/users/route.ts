import { NextResponse } from "next/server";
import { getSuperAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const roles = new Set(["admin", "editor", "super_admin"]);
type AdminRole = "admin" | "editor" | "super_admin";

export async function GET() {
  const current = await getSuperAdminUser();
  if (!current) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("admin_users").select("user_id, email, role, active, created_at").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Could not load admin users." }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: Request) {
  const current = await getSuperAdminUser();
  if (!current) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  let body: { email?: string; role?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = (body.role ?? "admin") as AdminRole;
  if (!/^\S+@\S+\.\S+$/.test(email) || !roles.has(role)) return NextResponse.json({ error: "Enter a valid email and role." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: existingAdmin, error: existingError } = await supabase.from("admin_users").select("user_id").eq("email", email).maybeSingle();
  if (existingError) return NextResponse.json({ error: "Could not verify the invitation address." }, { status: 500 });
  if (existingAdmin) return NextResponse.json({ error: "That user is already an admin." }, { status: 409 });
  const origin = new URL(request.url).origin;
  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/admin/reset-password` });
  if (inviteError || !invited.user) return NextResponse.json({ error: "We could not invite that user. Check the email and try again." }, { status: 400 });

  const { data, error } = await supabase.from("admin_users").insert({ user_id: invited.user.id, email, role, active: true }).select("user_id, email, role, active, created_at").single();
  if (error) {
    return NextResponse.json({ error: "We could not save the invited admin user." }, { status: 500 });
  }
  return NextResponse.json({ user: data }, { status: 201 });
}
