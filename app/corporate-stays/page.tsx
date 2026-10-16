import { CorporateStaysPage } from "@/src/components/CorporateStaysPage";
import { todayIso } from "@/src/lib/booking";
import { pageMetadata } from "@/src/lib/seo";
import { getHomepageHeroMedia, getPublicProperties } from "@/src/lib/supabase/content";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

export const metadata = pageMetadata("Insurance & Corporate Accommodation in Pakenham VIC");
export const dynamic = "force-dynamic";

export default async function Page() {
  const [properties, homepageHeroMedia] = await Promise.all([getPublicProperties(), getHomepageHeroMedia()]);
  const heroMedia = homepageHeroMedia.find(
    (media) => media.media_type === "image" && isApprovedHomepageMediaSource(media.public_url),
  );

  return <CorporateStaysPage today={todayIso()} properties={properties} heroImage={heroMedia?.public_url} heroAlt={heroMedia?.alt_text || "Serenity furnished homes in Pakenham"} />;
}
