import { CorporateStaysPage } from "@/src/components/CorporateStaysPage";
import { todayIso } from "@/src/lib/booking";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicPageCopy, getPublicPageMedia, getPublicProperties } from "@/src/lib/supabase/content";

export const metadata = pageMetadata("Insurance & Corporate Accommodation in Pakenham VIC");
export const dynamic = "force-dynamic";

export default async function Page() {
  const [properties, media, copy] = await Promise.all([getPublicProperties(), getPublicPageMedia(), getPublicPageCopy()]);
  return <CorporateStaysPage today={todayIso()} properties={properties} media={media} copy={copy} />;
}
