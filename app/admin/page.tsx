import { redirect } from "next/navigation";
import { SupabaseAdminDashboardV2, type AdminTab } from "@/src/components/SupabaseAdminDashboardV2";
import { getAdminUser } from "@/src/lib/supabase/auth";

const ADMIN_TABS = new Set<AdminTab>(["overview", "homepage", "page-images", "other-businesses", "guest-information", "contact-page", "houses", "bookings", "payments", "calendar", "partners", "enquiries", "contacts", "email-notifications", "users", "settings"]);

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; view?: string | string[] }> }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  const params = await searchParams;
  const rawTab = params.tab;
  const requestedTab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const rawView = params.view;
  const requestedView = Array.isArray(rawView) ? rawView[0] : rawView;
  if (requestedTab === "reviews" || (requestedTab === "houses" && requestedView === "reviews")) redirect("/admin?tab=houses");
  if (requestedTab === "earnings") redirect(admin.admin.role === "super_admin" ? "/admin?tab=payments&view=earnings" : "/admin?tab=payments");
  if (requestedTab === "receipts") redirect("/admin?tab=payments&view=receipts");
  const initialTab = requestedTab && ADMIN_TABS.has(requestedTab as AdminTab) ? requestedTab as AdminTab : "overview";
  const allowedTab = initialTab === "users" && admin.admin.role !== "super_admin" ? "overview" : initialTab;
  return <SupabaseAdminDashboardV2 email={admin.user.email ?? admin.admin.email} role={admin.admin.role} initialTab={allowedTab} />;
}
