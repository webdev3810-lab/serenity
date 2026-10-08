import Script from "next/script";
import { Poppins } from "next/font/google";
import { ADMIN_THEME_STYLE_ID, adminThemeCss, adminThemeBootstrap } from "@/src/lib/admin-theme";
import type { Metadata, Viewport } from "next";
import { AppShell } from "@/src/components/Layout";
import { getPublicContactSettings } from "@/src/lib/supabase/content";
import "./globals.css";
import "./public-page-theme.css";
import "./property-stay.css";
import "./rounded-design.css";
import "./homepage-hero.css";
import "./homepage-design.css";
import "./homepage-rejouice.css";
import "./houses-editorial.css";
import "./about-story.css";
import "./corporate-editorial.css";
import "./contact-story.css";
import "./public-neutral.css";
import "./policy-editorial.css";
import "./public-spacing.css";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  variable: "--font-poppins",
});

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
  themeColor: "#111111",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const contactSettings = await getPublicContactSettings();

  return (
    <html lang="en-AU" className={`${poppins.variable} ${poppins.className} h-full antialiased`} data-scroll-behavior="smooth">
      <head><style id={ADMIN_THEME_STYLE_ID}>{adminThemeCss}</style><Script id="serenity-admin-theme-init" strategy="beforeInteractive">{adminThemeBootstrap}</Script></head>
      <body className="min-h-full font-sans">
        <AppShell contactSettings={contactSettings}>{children}</AppShell>
      </body>
    </html>
  );
}
