"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bath, BedDouble, Car, ChevronRight, Dog, MapPin, Users } from "lucide-react";
import type { Property } from "@/src/data/properties";
import ScrollExpand from "@/src/components/ScrollExpand";
import Masonry, { type MasonryItem } from "@/src/components/Masonry";

type GalleryHouseChaptersProps = {
  properties: Property[];
};

const displayName = (name: string) => name.replace(" - Whole", "");
const HOUSE_ORDER = ["serenity-7", "serenity-9", "serenity-11"];

function photoCategory(alt: string) {
  const value = alt.toLowerCase();
  if (value.includes("bedroom")) return "Bedrooms";
  if (value.includes("kitchen")) return "Kitchens";
  if (value.includes("bathroom")) return "Bathrooms";
  if (value.includes("exterior") || value.includes("outdoor") || value.includes("garden") || value.includes("yard")) return "Outdoor spaces";
  return "Living areas";
}

export default function GalleryHouseChapters({ properties }: GalleryHouseChaptersProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  const orderedProperties = useMemo(
    () => properties.filter((property) => property.images.length > 0).sort((a, b) => {
      const aOrder = HOUSE_ORDER.indexOf(a.slug);
      const bOrder = HOUSE_ORDER.indexOf(b.slug);
      if (aOrder === -1 && bOrder === -1) return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      if (aOrder === -1) return 1;
      if (bOrder === -1) return -1;
      return aOrder - bOrder;
    }),
    [properties],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div className={`gallery-house-chapters ${reducedMotion ? "is-reduced-motion" : ""}`}>
      {orderedProperties.map((property, index) => {
        const images = property.images;
        const hero = images[0];
        const name = displayName(property.name);
        const masonryItems: MasonryItem[] = images.map((image, imageIndex) => ({
          id: `${property.slug}-${imageIndex}`,
          img: image.src,
          url: `/properties/${property.slug}`,
          height: [840, 620, 740, 560, 900, 680][imageIndex % 6],
          alt: image.alt,
          category: photoCategory(image.alt),
        }));

        return (
          <section id={`gallery-house-chapter-${property.slug}`} key={property.slug} className="gallery-house-chapter" aria-labelledby={`gallery-house-title-${property.slug}`}>
            <ScrollExpand
              src={hero.src}
              alt={hero.alt}
              enabled={!reducedMotion}
              title={<span className="gallery-house-title-text">{name}</span>}
              scrollHint={reducedMotion ? "" : index === 0 ? "Scroll to explore" : "Keep scrolling"}
              startWidth={54}
              startHeight={62}
              startRadius={28}
              mediaZoom={1.22}
              scrollDistance={reducedMotion ? 0 : 1.05}
              holdDistance={reducedMotion ? 0 : 0.36}
              smoothing={0.09}
              overlayScrim={0.56}
              useWindowScroll
              className="gallery-house-scroll-expand"
            >
              <div className="gallery-house-overlay-copy">
                <p className="gallery-house-kicker">House chapter</p>
                <h2 id={`gallery-house-title-${property.slug}`}>{name}</h2>
                <p>{property.shortDescription}</p>
                <div className="gallery-house-details">
                  <span><MapPin size={15} aria-hidden="true" /> {property.location}</span>
                  <span><Users size={15} aria-hidden="true" /> Up to {property.maxGuests} guests</span>
                  <span><BedDouble size={15} aria-hidden="true" /> {property.bedrooms} bedrooms · {property.beds} beds</span>
                  <span><Bath size={15} aria-hidden="true" /> {property.bathrooms} bathrooms</span>
                  {property.petsAllowed ? <span><Dog size={15} aria-hidden="true" /> Pet-friendly</span> : null}
                  <span><Car size={15} aria-hidden="true" /> {property.parkingType}</span>
                </div>
                <div className="gallery-house-actions">
                  <Link href={`/properties/${property.slug}`} className="gallery-house-link">
                    View house <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                  <Link href={`/properties/${property.slug}`} className="gallery-house-link gallery-house-link-secondary">
                    Check availability <ChevronRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </ScrollExpand>

            <section className="gallery-masonry-chapter" aria-labelledby={`gallery-masonry-title-${property.slug}`}>
              <div className="container">
                <div className="gallery-masonry-heading">
                  <div>
                    <p className="gallery-masonry-kicker">{name}</p>
                    <h3 id={`gallery-masonry-title-${property.slug}`}>A closer look at {name}.</h3>
                    <p>Browse every available photo in the same order as the house listing.</p>
                  </div>
                  <div className="gallery-masonry-summary">
                    <span>{images.length} photos</span>
                    <Link href={`/properties/${property.slug}`}>
                      View house <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                <Masonry
                  items={masonryItems}
                  animateFrom="bottom"
                  scaleOnHover
                  hoverScale={0.975}
                  blurToFocus
                  colorShiftOnHover={false}
                  disableAnimations={reducedMotion}
                  className="gallery-masonry"
                />
              </div>
            </section>
          </section>
        );
      })}
    </div>
  );
}
