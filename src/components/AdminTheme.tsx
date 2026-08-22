"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CircleDot, Moon, Sun } from "lucide-react";

export type AdminTheme = "light" | "dark" | "night";

const ADMIN_THEMES: AdminTheme[] = ["light", "dark", "night"];

type AdminThemeContextValue = {
  theme: AdminTheme;
  toggleTheme: () => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AdminTheme>("light");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedTheme = window.localStorage.getItem("serenity-admin-theme");
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "night") setTheme(storedTheme);
      else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => setTheme((current) => {
    const next = ADMIN_THEMES[(ADMIN_THEMES.indexOf(current) + 1) % ADMIN_THEMES.length];
    window.localStorage.setItem("serenity-admin-theme", next);
    return next;
  });

  return <AdminThemeContext.Provider value={{ theme, toggleTheme }}><div className={`admin-theme-context admin-theme-${theme}`}>{children}</div></AdminThemeContext.Provider>;
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) throw new Error("useAdminTheme must be used inside AdminThemeProvider");
  return context;
}

export function AdminThemeToggle() {
  const { theme, toggleTheme } = useAdminTheme();
  const nextTheme = ADMIN_THEMES[(ADMIN_THEMES.indexOf(theme) + 1) % ADMIN_THEMES.length];
  const icon = theme === "light" ? <Moon size={18} /> : theme === "dark" ? <CircleDot size={18} /> : <Sun size={18} />;
  return <button type="button" className="admin-icon-button" aria-label={`Switch to ${nextTheme} mode`} title={`Switch to ${nextTheme} mode`} onClick={toggleTheme}>{icon}</button>;
}
