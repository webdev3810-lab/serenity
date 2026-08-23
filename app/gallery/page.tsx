import GalleryCleanExperience from "@/src/components/GalleryCleanExperience";
import { getPublicProperties } from "@/src/lib/supabase/content";
import { pageMetadata } from "@/src/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "Gallery",
  "Explore the furnished houses, interiors and spaces available at Serenity Stays in Pakenham, Victoria.",
);

export default async function GalleryPage() {
  const properties = await getPublicProperties();

  return (
    <main className="gallery-clean-page">
      <GalleryCleanExperience properties={properties} />
    </main>
  );
}
