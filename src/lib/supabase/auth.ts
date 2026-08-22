import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export type AdminRole = "admin" | "editor" | "super_admin";
export type AuthenticatedAdmin = {
  user: { id: string; email?: string };
  admin: { user_id: string; email: string; role: AdminRole; active: boolean };
};

export async function getAdminUser() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id, email, role, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  return admin ? { user, admin: { ...admin, role: admin.role as AdminRole } } : null;
}

export async function getSuperAdminUser(): Promise<AuthenticatedAdmin | null> {
  const admin = await getAdminUser();
  return admin?.admin.role === "super_admin" ? admin : null;
}
