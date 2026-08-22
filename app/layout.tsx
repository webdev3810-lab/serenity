import type { Metadata, Viewport } from "next";
import { AppShell } from "@/src/components/Layout";
import { getPublicContactSettings, getPublicPromoSettings } from "@/src/lib/supabase/content";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://serenity-stays.example"),
  title: "Serenity Stays | Furnished houses in South East Melbourne",
  description: "Direct-book furnished houses in Pakenham, South East Melbourne, Victoria, Australia for family, corporate, relocation and extended stays.",
  openGraph: {
    title: "Serenity Stays | Furnished houses in South East Melbourne",
    description: "Direct-book furnished houses in Pakenham, South East Melbourne, Victoria, Australia for family, corporate, relocation and extended stays.",
    images: ["/og-placeholder.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#5A463A",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const contactSettings = await getPublicContactSettings();
  const promoSettings = await getPublicPromoSettings();

  return (
    <html lang="en-AU" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <AppShell contactSettings={contactSettings} promoSettings={promoSettings}>{children}</AppShell>
      </body>
    </html>
  );
}
