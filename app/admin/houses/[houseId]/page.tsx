import { redirect } from "next/navigation";
import { SupabaseAdminDashboardV2 } from "@/src/components/SupabaseAdminDashboardV2";
import { getAdminUser } from "@/src/lib/supabase/auth";

export default async function AdminHousePage({ params }: { params: Promise<{ houseId: string }> }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  const { houseId } = await params;
  const isNewHouse = houseId === "new";

  return <SupabaseAdminDashboardV2 email={admin.user.email ?? admin.admin.email} role={admin.admin.role} initialTab="houses" initialHouseId={isNewHouse ? "" : houseId} initialNewHouse={isNewHouse} />;
}
