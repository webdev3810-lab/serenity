"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Bath, BedDouble, BedSingle, CarFront, UsersRound, WashingMachine, Wifi, type LucideIcon } from "lucide-react";
import type { Property } from "@/src/data/properties";
import type { GuestCounts } from "@/src/lib/booking";
import { hasUnavailableConflict, validateGuestCapacity } from "@/src/lib/booking";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const comfortFeatures = [
  {
    number: "01",
    title: "Private whole homes",
    description: "Room to cook, work, rest and live at your own pace.",
  },
  {
    number: "02",
    title: "Flexible stays",
    description: "A practical base for families, relocations and project teams.",
  },
  {
    number: "03",
    title: "Everyday essentials",
    description: "Furnished spaces with kitchens, laundries and off-street parking.",
  },
  {
    number: "04",
    title: "Local support",
    description: "One responsive point of contact from enquiry to checkout.",
  },
] as const;

function ComfortGraphic({ variant }: { variant: number }) {
  if (variant === 1) {
    return (
      <svg className="houses-editorial-comfort__graphic houses-editorial-comfort__graphic--vertical" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 60 }).map((_, index) => {
          const height = index < 30 ? 10 + index * 2 : 10 + (index - 30) * 2.5;
          return <line key={index} x1={5 + index * 1.6} y1="100" x2={5 + index * 1.6} y2={100 - height} stroke="currentColor" strokeWidth="0.6" />;
        })}
      </svg>
    );
  }

  if (variant === 2) {
    return (
      <svg className="houses-editorial-comfort__graphic houses-editorial-comfort__graphic--horizontal" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
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
  }

  return (
    <svg className="houses-editorial-comfort__graphic houses-editorial-comfort__graphic--radial" viewBox="0 0 100 100" aria-hidden="true">
      <g transform="translate(50, 50)">
        {Array.from({ length: 72 }).map((_, index) => (
          <line key={index} x1="25" y1="0" x2={index % 2 === 0 ? "48" : "38"} y2="0" stroke="currentColor" strokeWidth="0.5" transform={`rotate(${index * 5})`} />
        ))}
      </g>
    </svg>
  );
}

function approvedImage(property: Property) {
  if (isApprovedHomepageMediaSource(property.featuredImage)) return property.featuredImage;
  return property.images.find((image) => isApprovedHomepageMediaSource(image.src))?.src ?? "";
}

function houseDetails(property: Property): { label: string; Icon: LucideIcon }[] {
  const details: { label: string; Icon: LucideIcon }[] = [
    { label: `Sleeps up to ${property.maxGuests}`, Icon: UsersRound },
    { label: `${property.bedrooms} ${property.bedrooms === 1 ? "bedroom" : "bedrooms"}`, Icon: BedDouble },
    { label: `${property.bathrooms} ${property.bathrooms === 1 ? "bathroom" : "bathrooms"}`, Icon: Bath },
    { label: `${property.beds} ${property.beds === 1 ? "bed" : "beds"}`, Icon: BedSingle },
  ];

  const parking = property.parkingType?.trim();
  if (parking) {
    const label = /free parking on premises/i.test(parking) && /free street parking/i.test(parking)
      ? "Free on-site & street parking"
      : /^free parking on premises$/i.test(parking) ? "Free on-site parking" : parking;
    details.push({ label, Icon: CarFront });
  }
  if (property.amenities.some((amenity) => /wi[\s-]?fi|wireless internet/i.test(amenity))) {
    details.push({ label: "Wi-Fi", Icon: Wifi });
  } else if (property.amenities.some((amenity) => /laundry|washer|washing machine/i.test(amenity))) {
    details.push({ label: "Laundry", Icon: WashingMachine });
  }

  return details;
}

function parseNonNegativeInteger(value: string | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
}

export function HousesEditorialPage({ properties }: { properties: Property[] }) {
  const comfortGridRef = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();
  const checkIn = searchParams.get("checkIn") || "";
  const checkout = searchParams.get("checkout") || "";
  const guests = parseNonNegativeInteger(searchParams.get("guests"));
  const pets = parseNonNegativeInteger(searchParams.get("pets"));
  const guestCounts = useMemo<GuestCounts | undefined>(() => {
    if (guests === null && pets === null) return undefined;
    return { adults: Math.max(1, guests ?? 1), children: 0, infants: 0, pets: pets ?? 0 };
  }, [guests, pets]);

  const results = useMemo(() => properties.filter((property) => {
    if (checkIn && checkout && hasUnavailableConflict(property, checkIn, checkout)) return false;
    if (guestCounts && validateGuestCapacity(property, guestCounts)) return false;
    return true;
  }), [checkIn, checkout, guestCounts, properties]);

  useGSAP(() => {
    const grid = comfortGridRef.current;
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    grid.querySelectorAll<HTMLElement>(".houses-editorial-comfort__card").forEach((card, index) => {
      const graphic = card.querySelector<SVGElement>(".houses-editorial-comfort__graphic");
      if (!graphic) return;

      const scrollTrigger = {
        trigger: card,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.6,
      };

      if (index === 0 || index === 3) {
        gsap.fromTo(graphic,
          { rotation: 0, transformOrigin: "center center" },
          { rotation: 360, ease: "none", scrollTrigger },
        );
      } else {
        const from = index === 1 ? "inset(100% 0% 0% 0%)" : "inset(0% 100% 0% 0%)";
        gsap.fromTo(graphic,
          { clipPath: from },
          { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger },
        );
      }
    });
  }, { scope: comfortGridRef });

  return (
    <div className="houses-editorial-page">
      <header className="houses-editorial-heading">
        <div>
          <h1 id="houses-editorial-title">Our houses</h1>
          <p>Quality, fully furnished homes in Pakenham.</p>
        </div>
        <p className="houses-editorial-heading__aside">Spacious. Comfortable. Move-in ready.<br />A private place to stay for family, work, or a change of scene.</p>
      </header>
      <section className="houses-editorial-list" id="houses-list" aria-labelledby="houses-editorial-title">
        {results.length ? results.map((property) => {
          const name = property.name.replace(" - Whole", "");
          const image = approvedImage(property);
          const href = `/properties/${property.slug}`;
          const details = houseDetails(property);

          return (
            <article className="houses-editorial-list__card" key={property.id || property.slug}>
              <Link href={href} className="houses-editorial-list__link">
                <span className="houses-editorial-list__media">
                  {image ? (
                    <Image
                      src={image}
                      alt={`${name} furnished house in Pakenham`}
                      fill
                      loading="eager"
                      sizes="(max-width: 760px) 100vw, (max-width: 1023px) 50vw, 33vw"
                      unoptimized={image.includes(".supabase.co/")}
                    />
                  ) : <span className="houses-editorial-list__fallback">House photos coming soon</span>}
                </span>
                <div className="houses-editorial-list__content">
                  <div className="houses-editorial-list__caption">
                    <span className="houses-editorial-list__title">{name}</span>
                  </div>
                  <ul className="houses-editorial-list__details" aria-label={`${name} at a glance`}>
                    {details.map(({ label, Icon }) => (
                      <li key={label}><Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></li>
                    ))}
                  </ul>
                  <span className="houses-editorial-list__cta">Explore house <ArrowUpRight size={17} aria-hidden="true" /></span>
                </div>
              </Link>
            </article>
          );
        }) : (
          <div className="houses-editorial-empty">
            <h2>No houses available for those dates.</h2>
            <p>Try different dates or guest numbers to see the full collection.</p>
            <Link href="/houses">View all houses <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        )}
      </section>

      <section className="houses-editorial-comfort" aria-labelledby="houses-editorial-comfort-title">
        <div className="houses-editorial-comfort__heading">
          <h2 id="houses-editorial-comfort-title">Stay in comfort.</h2>
          <p>Everything you need to arrive easily and feel at home.</p>
        </div>
      </section>
      <section ref={comfortGridRef} className="houses-editorial-comfort__grid" aria-label="Stay in comfort details">
          {comfortFeatures.map((feature, index) => (
            <article className={`houses-editorial-comfort__card${index % 2 ? " houses-editorial-comfort__card--soft" : ""}`} key={feature.number}>
              <div className="houses-editorial-comfort__card-copy">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
              <ComfortGraphic variant={index % 3} />
              <span className="houses-editorial-comfort__number">{feature.number}</span>
            </article>
          ))}
      </section>
    </div>
  );
}
