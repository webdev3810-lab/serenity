import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import GalleryEditorialExperience from "@/src/components/GalleryEditorialExperience";
import GalleryImmersiveIntro from "@/src/components/GalleryImmersiveIntro";
import ScrollWipeText from "@/src/components/homepage/ScrollWipeText";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import { getPublicProperties } from "@/src/lib/supabase/content";
import { pageMetadata } from "@/src/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "Gallery",
  "Explore the furnished houses, interiors and spaces available at Serenity Stays in Pakenham, Victoria.",
);

export default async function GalleryPage() {
  const properties = await getPublicProperties();
  const introImages = properties.flatMap((property) => {
    const image = property.images.find((item) => item.isCover && isApprovedHomepageMediaSource(item.src))
      ?? property.images.find((item) => isApprovedHomepageMediaSource(item.src));
    return image ? [{ src: image.src, alt: image.alt, name: property.name.replace(/\s+-\s+Whole$/i, "") }] : [];
  });

  return (
    <main className="bg-[#FAF8F5] text-[#2D2622]">
      <GalleryImmersiveIntro images={introImages} />

      <GalleryEditorialExperience properties={properties} />

      <section className="border-t border-[#D8CCC4] bg-[#EAE1DD] px-6 py-20 text-center sm:px-10 lg:py-28">
        <div className="mx-auto max-w-3xl"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#5A463A]">Ready when you are</p><ScrollWipeText as="h2" className="font-marcellus mt-5 text-4xl leading-[0.96] tracking-[-0.04em] sm:text-6xl">Find your Serenity house.</ScrollWipeText><p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#5A463A]">Explore the houses, check your dates, and make Pakenham your comfortable base.</p><Link href="/houses" className="mt-8 inline-flex items-center gap-3 bg-[#2D2622] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#5A463A]">Browse houses <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      </section>
    </main>
  );
}
