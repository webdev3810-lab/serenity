import { pageMetadata } from "@/src/lib/seo";
import { HousesEditorialPage } from "@/src/components/HousesEditorialPage";
import { getPublicProperties } from "@/src/lib/supabase/content";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Browse Serenity homes", "Explore furnished Serenity homes in Pakenham, Victoria, Australia.");

export default async function HousesPage() {
  return <HousesEditorialPage properties={await getPublicProperties()} />;
}
