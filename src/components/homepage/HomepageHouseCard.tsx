import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Property } from "@/src/data/properties";
import { formatAud } from "@/src/lib/booking";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

interface HomepageHouseCardProps {
  property: Property;
  /** Strips " - Whole" suffix from property names */
  displayName: (name: string) => string;
  reverse?: boolean;
}


/**
 * Editorial homepage property preview panel.
 * Shows image on one side, text on the other. Alternates side if reverse is true.
 */
export default function HomepageHouseCard({ property, displayName, reverse = false }: HomepageHouseCardProps) {
  const previewSrc = isApprovedHomepageMediaSource(property.featuredImage) ? property.featuredImage : "";
  const name = displayName(property.name);

  return (
    <article className={`section-editorial-split mb-24 last:mb-0 ${reverse ? 'reverse' : ''}`}>
      {/* House Image */}
      <Link
        href={`/properties/${property.slug}`}
        className="relative w-full aspect-[4/3] lg:aspect-[16/11] overflow-hidden rounded-none block group"
        tabIndex={-1}
        aria-hidden="true"
      >
        {previewSrc ? (
          <Image
            src={previewSrc}
            alt={`${name} furnished accommodation in Pakenham`}
            fill
            loading="lazy"
            sizes="(max-width: 1023px) 100vw, 60vw"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : <div className="absolute inset-0 bg-[#E8DED6]" aria-label="Property photo not available" />}
        {previewSrc ? <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition-colors duration-500" /> : null}
      </Link>

      {/* Card Body */}
      <div className="flex flex-col items-start justify-center p-2 lg:p-8">
        <h3 className="editorial-heading text-stone-900 mb-6">
          <Link href={`/properties/${property.slug}`} className="hover:text-stone-600 transition-colors">
            {name}
          </Link>
        </h3>

        <p className="text-lg text-stone-600 leading-relaxed mb-8 max-w-lg">
          {property.shortDescription}
        </p>

        <span className="text-xl font-bold text-stone-900 mb-8 block">
          From AUD {formatAud(property.nightlyPrice)} per night
        </span>

        <div className="flex flex-wrap items-center gap-4 w-full">
          <Link
            href={`/properties/${property.slug}#availability`}
            className="btn-primary flex-1 sm:flex-none text-center justify-center px-8 py-3.5 text-base font-bold inline-flex items-center gap-2"
          >
            Check availability <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <Link
            href={`/properties/${property.slug}`}
            className="btn-outline-dark flex-1 sm:flex-none text-center justify-center px-8 py-3.5 text-base font-bold"
          >
            View house
          </Link>
        </div>
      </div>
    </article>
  );
}
