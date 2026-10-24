import { AboutPage } from "@/src/components/AboutPage";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicContactSettings, getPublicProperties } from "@/src/lib/supabase/content";

export const metadata = pageMetadata("About Serenity | Furnished Houses in Pakenham VIC");
export const dynamic = "force-dynamic";

export default async function Page() {
  const [properties, contact] = await Promise.all([getPublicProperties(), getPublicContactSettings()]);
  return <AboutPage properties={properties} mapUrl={contact.mapUrl} />;
}
