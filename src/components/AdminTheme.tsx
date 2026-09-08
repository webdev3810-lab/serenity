"use client";
import { AdminWorkspaceProvider } from "@/src/components/admin/AdminUI";
import { ADMIN_THEME_KEY, ADMIN_THEME_STYLE_ID, adminThemeCss, adminThemeDeclarations, type AdminTheme } from "@/src/lib/admin-theme";
import { Moon, Sun } from "lucide-react";
import { createContext, useContext, useSyncExternalStore } from "react";
export type { AdminTheme } from "@/src/lib/admin-theme";
const eventName = "serenity-admin-theme-change";
const Context = createContext<{ theme: AdminTheme; toggleTheme: () => void } | null>(null);
let memoryChoice: AdminTheme | null = null;
function sheet() {
  let element = document.getElementById(ADMIN_THEME_STYLE_ID) as HTMLStyleElement | null;
  // Also supports isolated component previews; the Next root supplies this on real pages.
  if (!element) { element = document.createElement("style"); element.id = ADMIN_THEME_STYLE_ID; element.textContent = adminThemeCss; document.head.appendChild(element); }
  return element.sheet!;
}
function apply(theme: AdminTheme) {
  const style = sheet();
  while (style.cssRules.length > 2) style.deleteRule(2);
  style.insertRule(`#serenity-admin{${adminThemeDeclarations[theme]}}`, style.cssRules.length);
}
function snapshot(): AdminTheme {
  const style = sheet(); const rule = style.cssRules[2] as CSSStyleRule | undefined;
  return rule?.style.getPropertyValue("--serenity-theme").trim() === "dark" ? "dark" : "light";
}
function subscribe(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(ADMIN_THEME_KEY); if (stored === "night") { stored = "dark"; localStorage.setItem(ADMIN_THEME_KEY, stored); } } catch { /* Storage is optional. */ }
    apply(memoryChoice ?? (stored === "dark" || stored === "light" ? stored : media.matches ? "dark" : "light")); callback();
  };
  const storage = () => { memoryChoice = null; sync(); };
  window.addEventListener(eventName, callback); window.addEventListener("storage", storage); media.addEventListener("change", sync); sync();
  return () => { window.removeEventListener(eventName, callback); window.removeEventListener("storage", storage); media.removeEventListener("change", sync); };
}
export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light" as AdminTheme);
  const toggleTheme = () => {
    const next = snapshot() === "light" ? "dark" : "light";
    memoryChoice = next; apply(next);
    try { localStorage.setItem(ADMIN_THEME_KEY, next); } catch { /* Keep the choice for this visit. */ }
    window.dispatchEvent(new Event(eventName));
  };
  return <Context.Provider value={{ theme, toggleTheme }}><div id="serenity-admin" className="admin-theme-context"><AdminWorkspaceProvider>{children}</AdminWorkspaceProvider></div></Context.Provider>;
}
export function useAdminTheme() { const value = useContext(Context); if (!value) throw new Error("Admin theme provider missing"); return value; }
export function AdminThemeToggle() { const { toggleTheme } = useAdminTheme(); return <button type="button" className="admin-icon-button admin-theme-toggle" aria-label="Toggle light and dark theme" title="Toggle light and dark theme" onClick={toggleTheme}><Moon className="admin-theme-moon" size={18} /><Sun className="admin-theme-sun" size={18} /></button>; }
