import { ContactEditorialPage } from "@/src/components/ContactEditorialPage";
import { pageMetadata } from "@/src/lib/seo";
import { getHomepageContent } from "@/src/lib/supabase/content";
import { normalizeEditorialHomepageContent } from "@/src/lib/homepageEditorialContent";

export const metadata = pageMetadata(
  "Contact & Location | Serenity Furnished Houses in Pakenham VIC",
  "Contact Serenity for furnished houses in Pakenham and learn about the station, town centre, and local area nearby.",
);

export default async function Page() {
  const homepageContent = await getHomepageContent();
  // Keep the former prop present while dev clients with the previous component version refresh.
  return <ContactEditorialPage properties={[]} faqContent={normalizeEditorialHomepageContent(homepageContent)} />;
}
