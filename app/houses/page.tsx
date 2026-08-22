import { pageMetadata } from "@/src/lib/seo";
import { PropertiesSearchPage } from "@/src/components/PropertiesSearchPage";
import { getPublicProperties } from "@/src/lib/supabase/content";
import { todayIso } from "@/src/lib/booking";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Browse Serenity houses", "Explore furnished Serenity houses in Pakenham, Victoria, Australia.");

export default async function HousesPage() {
  return <PropertiesSearchPage properties={await getPublicProperties()} today={todayIso()} />;
}
