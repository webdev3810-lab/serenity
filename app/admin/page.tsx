import { redirect } from "next/navigation";
import { SupabaseAdminDashboardV2, type AdminTab } from "@/src/components/SupabaseAdminDashboardV2";
import { getAdminUser } from "@/src/lib/supabase/auth";

const ADMIN_TABS = new Set<AdminTab>(["overview", "homepage", "houses", "reviews", "promotions", "bookings", "calendar", "enquiries", "contacts", "users", "settings"]);

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  const rawTab = (await searchParams).tab;
  const requestedTab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const initialTab = requestedTab && ADMIN_TABS.has(requestedTab as AdminTab) ? requestedTab as AdminTab : "overview";
  const allowedTab = initialTab === "users" && admin.admin.role !== "super_admin" ? "overview" : initialTab;
  return <SupabaseAdminDashboardV2 email={admin.user.email ?? admin.admin.email} role={admin.admin.role} initialTab={allowedTab} />;
}
