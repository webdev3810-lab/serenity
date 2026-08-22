import { AdminThemeProvider } from "@/src/components/AdminTheme";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminThemeProvider>{children}</AdminThemeProvider>;
}
