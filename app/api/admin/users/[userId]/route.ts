import { NextResponse } from "next/server";
import { getSuperAdminUser } from "@/src/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const roles = new Set(["admin", "editor", "super_admin"]);
type AdminRole = "admin" | "editor" | "super_admin";

async function getTarget(userId: string) {
  const supabase = createSupabaseAdminClient();
  return supabase.from("admin_users").select("user_id, email, role, active, created_at").eq("user_id", userId).maybeSingle();
}

async function protectsLastSuperAdmin(userId: string, nextRole?: string, nextActive?: boolean) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("admin_users").select("user_id, role, active").eq("role", "super_admin");
  if (error) return true;
  const target = data?.find((user) => user.user_id === userId);
  if (!target) return false;
  const removingRole = nextRole !== undefined && nextRole !== "super_admin";
  const deactivating = nextActive === false && target.active;
  if (!removingRole && !deactivating) return false;
  return (data ?? []).length <= 1 || (deactivating && (data ?? []).filter((user) => user.active && user.user_id !== userId).length === 0);
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const current = await getSuperAdminUser();
  if (!current) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const { userId } = await context.params;
  let body: { role?: string; active?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (body.role !== undefined && !roles.has(body.role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  if (body.active !== undefined && typeof body.active !== "boolean") return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  const targetResult = await getTarget(userId);
  if (targetResult.error || !targetResult.data) return NextResponse.json({ error: "Admin user not found." }, { status: 404 });
  const nextRole = body.role as AdminRole | undefined;
  if (await protectsLastSuperAdmin(userId, nextRole, body.active)) return NextResponse.json({ error: "The last super_admin must remain active and cannot be removed." }, { status: 409 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("admin_users").update({ ...(nextRole !== undefined ? { role: nextRole } : {}), ...(body.active !== undefined ? { active: body.active } : {}) }).eq("user_id", userId).select("user_id, email, role, active, created_at").single();
  if (error) return NextResponse.json({ error: "Could not update admin user." }, { status: 500 });
  return NextResponse.json({ user: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const current = await getSuperAdminUser();
  if (!current) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  const { userId } = await context.params;
  const targetResult = await getTarget(userId);
  if (targetResult.error || !targetResult.data) return NextResponse.json({ error: "Admin user not found." }, { status: 404 });
  if (targetResult.data.role === "super_admin" && await protectsLastSuperAdmin(userId, "admin", false)) return NextResponse.json({ error: "The last super_admin cannot be removed." }, { status: 409 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: "Could not remove admin user." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
