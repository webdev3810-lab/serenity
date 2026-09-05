"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { GuestCounts } from "@/src/lib/booking";
import { hasUnavailableConflict, validateGuestCapacity } from "@/src/lib/booking";
import type { Property } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import ScrollWipeText from "@/src/components/homepage/ScrollWipeText";
import ScrollWipeCard from "@/src/components/homepage/ScrollWipeCard";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const parseNonNegativeInteger = (value: string | null) => {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
};

const ComfortGraphicOne = () => (
  <svg className="houses-comfort-graphic houses-comfort-graphic-radial" viewBox="0 0 100 100" data-graphic-type="radial" aria-hidden="true">
    <g transform="translate(50, 50)">
      {Array.from({ length: 72 }).map((_, index) => (
        <line
          key={index}
          x1="25"
          y1="0"
          x2={index % 2 === 0 ? "48" : "38"}
          y2="0"
          stroke="currentColor"
          strokeWidth="0.5"
          transform={`rotate(${index * 5})`}
        />
      ))}
    </g>
  </svg>
);

const ComfortGraphicTwo = () => (
  <svg className="houses-comfort-graphic houses-comfort-graphic-vertical" viewBox="0 0 100 100" preserveAspectRatio="none" data-graphic-type="vertical" aria-hidden="true">
    {Array.from({ length: 60 }).map((_, index) => {
      const height = index < 30 ? 10 + index * 2 : 10 + (index - 30) * 2.5;
      return (
        <line
          key={index}
          x1={5 + index * 1.6}
          y1="100"
          x2={5 + index * 1.6}
          y2={100 - height}
          stroke="currentColor"
          strokeWidth="0.6"
        />
      );
    })}
  </svg>
);

const ComfortGraphicThree = () => (
  <svg className="houses-comfort-graphic houses-comfort-graphic-horizontal" viewBox="0 0 100 100" preserveAspectRatio="none" data-graphic-type="horizontal" aria-hidden="true">
    {Array.from({ length: 25 }).map((_, index) => {
      const y = 10 + index * 3.5;
      const gapCenter = Math.abs(12 - index) * 3;
      return (
        <g key={index} stroke="currentColor" strokeWidth="1">
          <line x1="0" y1={y} x2={40 + gapCenter} y2={y} />
          <line x1={70 + gapCenter} y1={y} x2="150" y2={y} />
        </g>
      );
    })}
  </svg>
);

const comfortGraphics = [ComfortGraphicOne, ComfortGraphicTwo, ComfortGraphicThree];

const comfortFeatures = [
  {
    number: "01",
    title: "Pet-friendly homes",
    description: "Private homes where guests can comfortably settle in with their pets.",
    tone: "",
  },
  {
    number: "02",
    title: "Convenient parking",
    description: "Off-street parking makes every arrival and daily trip seamless.",
    tone: "dark",
  },
  {
    number: "03",
    title: "Move-in-ready comfort",
    description: "Thoughtfully prepared homes with full kitchens, laundries, and everyday essentials.",
    tone: "",
  },
  {
    number: "04",
    title: "Prepared for your arrival",
    description: "Fresh, meticulously prepared environments ensuring a calm standard for every stay.",
    tone: "stone",
  },
] as const;

export function PropertiesSearchPage({ properties }: { properties: Property[] }) {
  return <PropertiesSearchContent properties={properties} />;
}

function PropertiesSearchContent({ properties }: { properties: Property[] }) {
  const searchParams = useSearchParams();
  const comfortSectionRef = useRef<HTMLElement>(null);

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
  const propertyTaglines: Record<string, string> = {
    "serenity-7": "Whole-home privacy · Fully furnished",
    "serenity-9": "Flexible stays · Off-street parking",
    "serenity-11": "Pet friendly · Move-in ready",
  };

  useGSAP(() => {
    const section = comfortSectionRef.current;
    if (!section) return;

    const cards = section.querySelectorAll<HTMLElement>(".houses-comfort-card");
    if (!cards.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      gsap.set(cards, { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 });
      gsap.set(section.querySelectorAll(".houses-comfort-graphic"), { clearProps: "all" });
      return;
    }

    gsap.fromTo(
      cards,
      { clipPath: "inset(100% 0% 0% 0%)" },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1.2,
        stagger: 0.15,
        ease: "power3.inOut",
        scrollTrigger: {
          trigger: section,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      },
    );

    const matchMedia = gsap.matchMedia();
    matchMedia.add(
      {
        isDesktop: "(min-width: 1024px)",
        isTablet: "(min-width: 768px) and (max-width: 1023px)",
        isMobile: "(max-width: 767px)",
      },
      (context) => {
        const { isMobile = false, isTablet = false } = (context.conditions ?? {}) as Partial<{
          isMobile: boolean;
          isTablet: boolean;
        }>;
        const multiplier = isMobile ? 0.3 : isTablet ? 0.6 : 1;

        cards.forEach((card, index) => {
          const graphic = card.querySelector<SVGElement>(".houses-comfort-graphic");
          if (!graphic) return;

          const type = graphic.getAttribute("data-graphic-type");
          const scrollTrigger = {
            trigger: card,
            start: "top 90%",
            end: "center center",
            scrub: 1,
          };
          let fromVars: gsap.TweenVars = {};
          let toVars: gsap.TweenVars = { ease: "none", scrollTrigger };

          if (type === "radial") {
            fromVars = { scale: 0.8, rotation: -30 * multiplier, transformOrigin: "center center" };
            toVars = { ...toVars, scale: 1.05, rotation: 30 * multiplier };
          } else if (type === "vertical") {
            fromVars = { clipPath: "inset(100% 0 0 0)" };
            toVars = { ...toVars, clipPath: "inset(0% 0 0 0)" };
          } else if (type === "horizontal") {
            fromVars = { clipPath: "inset(0 100% 0 0)" };
            toVars = { ...toVars, clipPath: "inset(0 0% 0 0)" };
          } else {
            const yOffset = (index % 2 === 0 ? 30 : -25) * multiplier;
            fromVars = { y: yOffset };
            toVars = { ...toVars, y: -yOffset };
          }

          gsap.fromTo(graphic, fromVars, toVars);
        });
      },
    );

    return () => matchMedia.revert();
  }, { scope: comfortSectionRef });

  return (
    <div className="houses-page">
      <section className="houses-results-section">
        <div className="houses-page-container">
          <div className="houses-results-layout">
            <div className="houses-results-column">
              {results.length ? (
                <>
                  <ScrollWipeText as="p" className="houses-reference-eyebrow">Serenity houses</ScrollWipeText>
                  <div className="homepage-house-collection-grid">
                  {results.map((property, index) => {
                    const name = displayName(property.name);
                    const image = isApprovedHomepageMediaSource(property.featuredImage) ? property.featuredImage : "";
                    const tagline = propertyTaglines[property.slug] || property.shortDescription;

                    return (
                      <ScrollWipeCard key={property.id || property.slug} delayMs={index * 110}>
                        <Link href={`/properties/${property.slug}`} className="homepage-house-collection-media" aria-label={`View ${name}`}>
                          {image ? (
                            <Image
                              src={image}
                              alt={`${name} furnished house in Pakenham`}
                              fill
                              sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                              className="homepage-house-collection-image"
                            />
                          ) : (
                            <span>House photo coming soon</span>
                          )}
                        </Link>
                        <div className="homepage-house-collection-body">
                          <div>
                            <h3>
                              <Link href={`/properties/${property.slug}`}>{name}</Link>
                            </h3>
                            <p>{tagline}</p>
                          </div>
                          <Link
                            href={`/properties/${property.slug}`}
                            className="homepage-house-collection-link"
                            aria-label={`View ${name}`}
                          >
                            <ArrowUpRight size={17} aria-hidden="true" />
                          </Link>
                        </div>
                      </ScrollWipeCard>
                    );
                  })}
                  </div>
                </>
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

      <section ref={comfortSectionRef} className="houses-comfort-section" aria-labelledby="houses-comfort-heading">
        <div className="houses-page-container">
          <ScrollWipeText as="h2" id="houses-comfort-heading" className="houses-comfort-heading">
            Comfort for every kind of stay —
            <br />
            a clear perspective that guides
            <br />
            every decision we make.
          </ScrollWipeText>

          <div className="houses-comfort-grid">
            {comfortFeatures.map((feature, index) => {
              const ComfortGraphic = comfortGraphics[index % comfortGraphics.length];

              return (
                <article
                  className={`houses-comfort-card${feature.tone ? ` houses-comfort-card-${feature.tone}` : ""}`}
                  key={feature.number}
                >
                  <div className="houses-comfort-card-copy">
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                  <ComfortGraphic />
                  <span className="houses-comfort-card-number">{feature.number}</span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
