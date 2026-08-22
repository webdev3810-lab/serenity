import { GsapFadeIn } from "./AnimatedSection";
import type { Property } from "@/src/data/properties";
import AccordionGallery from "../AccordionGallery";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import ScrollWipeText from "./ScrollWipeText";

export interface HomepageFeaturedHousesSectionProps {
  eyebrow?: string;
  heading: string;
  description?: string;
  properties: Property[];
  /** Display name transform — strips " - Whole" suffix */
  displayName: (name: string) => string;
  allHousesHref?: string;
  allHousesLabel?: string;
  showAdjacentNote?: boolean;
  adjacentNoteText?: string;
  className?: string;
}

export default function HomepageFeaturedHousesSection({
  eyebrow = "Our Houses",
  properties,
  displayName,
  className = "",
}: HomepageFeaturedHousesSectionProps) {
  const galleryItems = properties
    .map((property) => ({
      image: isApprovedHomepageMediaSource(property.featuredImage) ? property.featuredImage : "",
      label: displayName(property.name),
      link: `/properties/${property.slug}`,
      alt: `${displayName(property.name)} furnished house`,
    }))
    .filter((item) => item.image);

  return (
    <section id="featured-houses" className={`bg-[#F7F4F1] py-20 lg:py-32 w-full overflow-hidden ${className}`}>
      <div className="grid w-full gap-10 lg:grid-cols-[minmax(19rem,0.55fr)_minmax(0,1.45fr)] lg:items-stretch lg:gap-0">
        <GsapFadeIn className="flex min-w-0 flex-col justify-center px-6 sm:px-10 lg:items-end lg:min-h-[clamp(36rem,78svh,54rem)] lg:border-r lg:border-[#D8CCC4] lg:pl-12 lg:pr-10 lg:text-right">
          <ScrollWipeText
            as="h2"
            aria-label={eyebrow || "Our Houses"}
            className="display-font text-[clamp(4.5rem,8vw,9.5rem)] font-bold uppercase leading-[0.78] tracking-[-0.075em] text-[#1D1D1B] lg:text-right"
          >
            OUR
            <br />
            HOUSES
          </ScrollWipeText>

          <p className="mt-10 max-w-[24ch] text-base leading-[1.55] text-[#6F5A4D] sm:text-lg lg:text-right">
            Three private, fully furnished homes in Pakenham, made for calm stays and time together.
          </p>
        </GsapFadeIn>

        <GsapFadeIn className="w-full min-w-0">
        {galleryItems.length > 0 ? (
          <AccordionGallery
            items={galleryItems}
            defaultIndex={Math.min(1, galleryItems.length - 1)}
            accentColor="#F7F4F1"
            overlayColor="#2D2521"
            textColor="#FFFFFF"
            height="clamp(36rem, 78svh, 54rem)"
            gap={8}
            radius={6}
            expandRatio={0.56}
            tilt={0}
            parallax={0.35}
            trigger="hover"
            grayscale={false}
            className="homepage-featured-gallery"
          />
        ) : (
          <div className="rounded-none bg-[#EAE1DD] px-6 py-16 text-center text-stone-700">Our houses will appear here soon.</div>
        )}
        </GsapFadeIn>
      </div>
    </section>
  );
}
