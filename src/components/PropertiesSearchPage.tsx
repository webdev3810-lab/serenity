"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import AccordionGallery from "@/src/components/AccordionGallery";
import type { GuestCounts } from "@/src/lib/booking";
import { formatAud, hasUnavailableConflict, validateGuestCapacity } from "@/src/lib/booking";
import type { Property } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

const parseNonNegativeInteger = (value: string | null) => {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
};

export function PropertiesSearchPage({ properties }: { properties: Property[] }) {
  return <PropertiesSearchContent properties={properties} />;
}

function PropertiesSearchContent({ properties }: { properties: Property[] }) {
  const searchParams = useSearchParams();

  const checkIn = searchParams.get("checkIn") || "";
  const checkout = searchParams.get("checkout") || "";
  const guestTotal = parseNonNegativeInteger(searchParams.get("guests"));
  const petTotal = parseNonNegativeInteger(searchParams.get("pets"));
  const initialGuests = useMemo<GuestCounts | undefined>(() => {
    if (guestTotal === null && petTotal === null) return undefined;
    return {
      adults: Math.max(1, guestTotal ?? 1),
      children: 0,
      infants: 0,
      pets: petTotal ?? 0,
    };
  }, [guestTotal, petTotal]);

  const results = useMemo(() => {
    let filtered = [...properties];

    if (checkIn && checkout) {
      filtered = filtered.filter((property) => !hasUnavailableConflict(property, checkIn, checkout));
    }

    if (initialGuests) {
      filtered = filtered.filter((property) => !validateGuestCapacity(property, initialGuests));
    }

    return filtered.sort((a, b) => a.id.localeCompare(b.id));
  }, [checkIn, checkout, initialGuests, properties]);

  const displayName = (name: string) => name.replace(" - Whole", "");
  const cleanDescription = (description: string) => description.replace(/^live\s+work\s+play\s*[-–—:·]?\s*/i, "").trim();
  const galleryItems = results.map((property) => ({
    image: isApprovedHomepageMediaSource(property.featuredImage) ? property.featuredImage : "",
    label: displayName(property.name),
    description: cleanDescription(property.shortDescription),
    details: `${formatAud(property.nightlyPrice)} / night · Sleeps ${property.maxGuests} · ${property.bedrooms} bedrooms · ${property.beds} beds · ${property.bathrooms} baths · ${property.petsAllowed ? "Pet-friendly" : "No pets"}`,
    link: `/properties/${property.slug}`,
    alt: `${displayName(property.name)} furnished house in Pakenham`,
  }));

  return (
    <div className="houses-page">
      <section className="houses-results-section">
        <div className="houses-page-container">
          <div className="houses-results-header">
            <div>
              <h2 className="houses-wordmark">SERENITY HOUSES</h2>
            </div>
          </div>

          <div className="houses-results-layout">
            <div className="houses-results-column">
              {results.length ? (
                <div className="houses-results-gallery">
                  <AccordionGallery
                    items={galleryItems}
                    defaultIndex={Math.min(1, galleryItems.length - 1)}
                    accentColor="#F7F4F1"
                    overlayColor="#2D2521"
                    textColor="#FFFFFF"
                    height="clamp(24rem, 52vw, 40rem)"
                    gap={8}
                    radius={0}
                    expandRatio={0.56}
                    tilt={0}
                    parallax={0.35}
                    trigger="hover"
                    grayscale={false}
                    className="houses-listing-gallery"
                  />
                </div>
              ) : (
                <div className="houses-empty-state">
                  <h2>No houses are available for those dates.</h2>
                  <p>Try different dates, fewer guests, or clear the search to see every Serenity house again.</p>
                  <Link href="/houses" className="houses-view-link">View all houses <ArrowUpRight size={15} /></Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      <section className="houses-stats-section" aria-label="Serenity house highlights">
        <div className="houses-page-container houses-stats-grid">
          <article className="houses-stat-card">
            <p className="houses-stat-value">8</p>
            <h2>Years hosting</h2>
            <p>Superhost recognition and positive guest reviews.</p>
          </article>
          <article className="houses-stat-card">
            <p className="houses-stat-value">5 min</p>
            <h2>Walk to Pakenham station</h2>
            <p>Steps away from the bus station.</p>
          </article>
          <article className="houses-stat-card">
            <p className="houses-stat-value">3</p>
            <h2>Private houses</h2>
            <p>Leisure, corporate, insurance, and travel-agent bookings welcome.</p>
          </article>
        </div>
      </section>

    </div>
  );
}
