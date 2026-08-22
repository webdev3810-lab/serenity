"use client";

import { createContext, useContext } from "react";
import type { ContactSettings } from "@/src/lib/siteSettings";

const ContactSettingsContext = createContext<ContactSettings | null>(null);

export function ContactSettingsProvider({ settings, children }: { settings: ContactSettings; children: React.ReactNode }) {
  return <ContactSettingsContext.Provider value={settings}>{children}</ContactSettingsContext.Provider>;
}

export function useContactSettings() {
  return useContext(ContactSettingsContext);
}
