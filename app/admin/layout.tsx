import { AdminThemeProvider } from "@/src/components/AdminTheme";
import "./admin.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminThemeProvider>{children}</AdminThemeProvider>;
}
