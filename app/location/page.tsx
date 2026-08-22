import { LocationPage } from "@/src/components/LocationPage";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicContactSettings } from "@/src/lib/supabase/content";

export const metadata = pageMetadata(
  "Location | Serenity Furnished Houses in Pakenham VIC",
  "Find Serenity furnished houses near Pakenham Station, local shops, and the wider Cardinia region.",
);

export default async function Page() {
  return <LocationPage contact={await getPublicContactSettings()} />;
}
