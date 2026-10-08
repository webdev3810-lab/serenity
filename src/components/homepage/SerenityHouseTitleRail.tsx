"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SerenityHouseTitleRailProps = {
  houses: { name: string; slug: string; maxGuests: number; bedrooms: number; beds: number; bathrooms: number }[];
};

export default function SerenityHouseTitleRail({ houses }: SerenityHouseTitleRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    const section = rail?.closest<HTMLElement>(".serenity-editorial-houses");
    if (!rail || !section || houses.length === 0) return;

    const firstHouse = section.querySelector<HTMLElement>(".serenity-editorial-house");
    let frame = 0;
    let snapTimer = 0;

    const update = () => {
      frame = 0;
      const houseHeight = firstHouse?.getBoundingClientRect().height || window.innerHeight || 1;
      const scrollInsideSection = Math.max(0, -section.getBoundingClientRect().top);
      setActiveIndex(Math.min(Math.round(scrollInsideSection / houseHeight), houses.length - 1));
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);

      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        const houseHeight = firstHouse?.getBoundingClientRect().height || window.innerHeight || 1;
        const sectionRect = section.getBoundingClientRect();
        const sectionTop = sectionRect.top + window.scrollY;
        const sectionEnd = sectionTop + sectionRect.height - window.innerHeight;

        if (window.scrollY < sectionTop || window.scrollY > sectionEnd) return;

        const snapIndex = Math.min(
          Math.max(Math.round((window.scrollY - sectionTop) / houseHeight), 0),
          houses.length,
        );
        const target = Math.min(sectionTop + snapIndex * houseHeight, sectionEnd);

        if (Math.abs(window.scrollY - target) < 2) return;
        window.scrollTo({ top: target, behavior: "smooth" });
      }, 160);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      window.clearTimeout(snapTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [houses]);

  const activeHouse = houses[activeIndex];
  const houseFacts = activeHouse ? [
    `Sleeps up to ${activeHouse.maxGuests}`,
    `${activeHouse.bedrooms} ${activeHouse.bedrooms === 1 ? "bedroom" : "bedrooms"}`,
    `${activeHouse.beds} ${activeHouse.beds === 1 ? "bed" : "beds"}`,
    `${activeHouse.bathrooms} ${activeHouse.bathrooms === 1 ? "bathroom" : "bathrooms"}`,
  ] : [];

  return (
    <div className="serenity-editorial-title-rail" ref={railRef}>
      <div className="serenity-editorial-title-rail__mask" aria-hidden="true">
        <p key={activeHouse?.slug}>{activeHouse?.name ?? ""}</p>
      </div>
      {activeHouse && (
        <div className="serenity-editorial-title-rail__details" key={activeHouse.slug}>
          <ul aria-label={`${activeHouse.name} details`}>
            {houseFacts.map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
          <Link href={`/properties/${activeHouse.slug}`}>Explore {activeHouse.name} <span aria-hidden="true">→</span></Link>
        </div>
      )}
    </div>
  );
}
