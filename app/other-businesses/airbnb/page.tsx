import { pageMetadata } from "@/src/lib/seo";
import { OtherBusinessDetailPage } from "@/src/components/OtherBusinessDetailPage";
import { getOtherBusinessesContent } from "@/src/lib/supabase/otherBusinesses";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Casa de Vacacion | Your Private Retreat in Bataan",
  "Explore a peaceful two-bedroom entire-home stay in Orani, Bataan. Discover the home, places to explore, and live availability on Airbnb.",
);

export default async function AirbnbHomePage() {
  const content = await getOtherBusinessesContent();
  return <OtherBusinessDetailPage business={content.businesses.airbnb} kind="airbnb" />;
}
