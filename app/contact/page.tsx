import { ContactEditorialPage } from "@/src/components/ContactEditorialPage";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicProperties } from "@/src/lib/supabase/content";

export const metadata = pageMetadata(
  "Contact & Location | Serenity Furnished Houses in Pakenham VIC",
  "Contact Serenity for furnished houses in Pakenham and learn about the station, town centre, and local area nearby.",
);

export default async function Page() {
  const properties = await getPublicProperties();
  return <ContactEditorialPage properties={properties} />;
}
