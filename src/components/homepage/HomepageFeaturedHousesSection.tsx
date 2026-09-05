import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Property } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import ScrollWipeText from "./ScrollWipeText";
import ScrollWipeCard from "./ScrollWipeCard";

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
  eyebrow = "The Serenity Collection",
  heading,
  description = "Book individually or together for teams who benefit from staying close—while retaining the privacy of their own front door.",
  properties,
  displayName,
  className = "",
}: HomepageFeaturedHousesSectionProps) {
  const propertyTaglines: Record<string, string> = {
    "serenity-7": "Whole-home privacy · Fully furnished",
    "serenity-9": "Flexible stays · Off-street parking",
    "serenity-11": "Pet friendly · Move-in ready",
  };

  return (
    <section id="featured-houses" className={`homepage-house-collection ${className}`.trim()}>
      <div className="homepage-house-collection-container">
        <div className="homepage-house-collection-intro">
          <div>
            <p className="homepage-house-collection-eyebrow">{eyebrow}</p>
            <ScrollWipeText as="h2" className="homepage-house-collection-title">
              {heading}
            </ScrollWipeText>
          </div>
          <p className="homepage-house-collection-description">{description}</p>
        </div>

        {properties.length > 0 ? (
          <div className="homepage-house-collection-grid">
            {properties.map((property, index) => {
              const image = isApprovedHomepageMediaSource(property.featuredImage) ? property.featuredImage : "";
              const name = displayName(property.name);
              const tagline = propertyTaglines[property.slug] || property.shortDescription;

              return (
                <ScrollWipeCard key={property.id || property.slug} delayMs={index * 110}>
                  <div className="homepage-house-collection-media">
                    {image ? (
                      <Image
                        src={image}
                        alt={`${name} furnished house`}
                        fill
                        sizes="(max-width: 680px) 100vw, (max-width: 1000px) 50vw, 33vw"
                        className="homepage-house-collection-image"
                      />
                    ) : (
                      <span className="homepage-house-collection-placeholder">House photo coming soon</span>
                    )}
                  </div>
                  <div className="homepage-house-collection-body">
                    <div>
                      <h3>{name}</h3>
                      <p>{tagline}</p>
                    </div>
                    <Link href={`/properties/${property.slug}`} className="homepage-house-collection-link" aria-label={`View ${name}`}>
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </Link>
                  </div>
                </ScrollWipeCard>
              );
            })}
          </div>
        ) : (
          <div className="homepage-house-collection-empty">Our houses will appear here soon.</div>
        )}
      </div>
    </section>
  );
}
