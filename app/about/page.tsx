import { AboutPage } from "@/src/components/AboutPage";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicProperties } from "@/src/lib/supabase/content";

export const metadata = pageMetadata("About Serenity | Furnished Houses in Pakenham VIC");
export const dynamic = "force-dynamic";

export default async function Page() {
  return <AboutPage properties={await getPublicProperties()} />;
}
