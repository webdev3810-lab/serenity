import { redirect } from "next/navigation";
import { SupabaseAdminDashboardV2 } from "@/src/components/SupabaseAdminDashboardV2";
import { getAdminUser } from "@/src/lib/supabase/auth";

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return <SupabaseAdminDashboardV2 email={admin.user.email ?? admin.admin.email} role={admin.admin.role} />;
}
