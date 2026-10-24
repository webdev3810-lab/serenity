import { CorporateStaysPage } from "@/src/components/CorporateStaysPage";
import { todayIso } from "@/src/lib/booking";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicProperties } from "@/src/lib/supabase/content";

export const metadata = pageMetadata("Insurance & Corporate Accommodation in Pakenham VIC");
export const dynamic = "force-dynamic";

export default async function Page() {
  const properties = await getPublicProperties();
  return <CorporateStaysPage today={todayIso()} properties={properties} />;
}
