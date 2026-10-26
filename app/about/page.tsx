import { AboutPage } from "@/src/components/AboutPage";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicContactSettings, getPublicPageCopy, getPublicPageMedia, getPublicProperties } from "@/src/lib/supabase/content";

export const metadata = pageMetadata("About Serenity | Furnished Houses in Pakenham VIC");
export const dynamic = "force-dynamic";

export default async function Page() {
  const [properties, contact, media, copy] = await Promise.all([getPublicProperties(), getPublicContactSettings(), getPublicPageMedia(), getPublicPageCopy()]);
  return <AboutPage properties={properties} mapUrl={contact.mapUrl} media={media} copy={copy} />;
}
