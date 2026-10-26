import { ContactEditorialPage } from "@/src/components/ContactEditorialPage";
import { pageMetadata } from "@/src/lib/seo";
import { getHomepageContent, getPublicHouseOptions, getPublicPageCopy, getPublicPageMedia } from "@/src/lib/supabase/content";
import { normalizeEditorialHomepageContent } from "@/src/lib/homepageEditorialContent";

export const metadata = pageMetadata(
  "Contact & Location | Serenity Furnished Houses in Pakenham VIC",
  "Contact Serenity for furnished houses in Pakenham and learn about the station, town centre, and local area nearby.",
);
export const dynamic = "force-dynamic";

export default async function Page() {
  const [homepageContent, media, copy, properties] = await Promise.all([getHomepageContent(), getPublicPageMedia(), getPublicPageCopy(), getPublicHouseOptions().catch(() => [])]);
  return <ContactEditorialPage properties={properties} faqContent={normalizeEditorialHomepageContent(homepageContent)} media={media} copy={copy} />;
}
