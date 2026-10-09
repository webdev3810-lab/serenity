"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Property } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

export interface HomepageFeaturedHousesSectionProps {
  eyebrow?: string;
  heading: string;
  description?: string;
  properties: Property[];
  allHousesHref?: string;
  allHousesLabel?: string;
  showAdjacentNote?: boolean;
  adjacentNoteText?: string;
  className?: string;
}

type HouseCopyProps = {
  property: Property;
  index: number;
  overlay?: boolean;
};

function HouseTitle({ name }: { name: string }) {
  return (
    <h2 aria-label={name}>
      {Array.from(name).map((character, charIndex) => (
        <span
          aria-hidden="true"
          key={`${character}-${charIndex}`}
          style={{ transitionDelay: `${charIndex * 18}ms` }}
        >
          {character === " " ? "\u00a0" : character}
        </span>
      ))}
    </h2>
  );
}

function HouseCopy({ property, index, overlay = false }: HouseCopyProps) {
  const name = property.name.replace(" - Whole", "");
  const className = overlay
    ? "homepage-house-showcase-copy homepage-house-showcase-copy-layer-item"
    : "homepage-house-showcase-copy homepage-house-showcase-mobile-copy";

  return (
    <div
      className={className}
      data-house-overlay-copy={overlay ? true : undefined}
      aria-hidden={overlay ? index !== 0 : undefined}
    >
      <HouseTitle name={name} />
      <Link
        href={`/properties/${property.slug}`}
        tabIndex={overlay && index !== 0 ? -1 : 0}
        aria-label={`View ${name}`}
      >
        View home <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function HomepageFeaturedHousesSection({
  properties,
  className = "",
}: HomepageFeaturedHousesSectionProps) {
  const displayName = (name: string) => name.replace(" - Whole", "");
  const showcaseProperties = properties.slice(0, 3);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || showcaseProperties.length < 2) return;

    const steps = Array.from(section.querySelectorAll<HTMLElement>("[data-house-step]"));
    const copyLayers = Array.from(section.querySelectorAll<HTMLElement>("[data-house-overlay-copy]"));
    if (!steps.length) return;

    let measureFrame = 0;
    let renderFrame = 0;
    let snapTimer: number | undefined;
    let snapReleaseTimer: number | undefined;
    let lastScrollY = window.scrollY;
    let scrollDirection = 1;
    let isSnapping = false;
    const snapDelay = 280;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileLayout = window.matchMedia("(max-width: 1023px)");
    const currentWipes: number[] = steps.map((_, index) => (index === 0 ? 0 : 100));
    const targetWipes: number[] = [...currentWipes];
    const currentOffsets: number[] = steps.map((_, index) => (index === 0 ? 0 : 2.5));
    const targetOffsets: number[] = [...currentOffsets];
    const currentScales: number[] = steps.map((_, index) => (index === 0 ? 1 : 1.035));
    const targetScales: number[] = [...currentScales];
    const targetCopyOpacity: number[] = copyLayers.map((_, index) => (index === 0 ? 1 : 0));
    const currentCopyOffsets: number[] = copyLayers.map((_, index) => (index === 0 ? 0 : 1.5));
    const targetCopyOffsets: number[] = [...currentCopyOffsets];
    const targetProgress: number[] = steps.map((_, index) => (index === 0 ? 1 : 0));
    const houseRevealThreshold = 0.98;

    const approach = (current: number, target: number) => {
      if (reducedMotion) return target;
      const next = current + (target - current) * 0.2;
      return Math.abs(target - next) < 0.05 ? target : next;
    };

    const renderWipe = () => {
      renderFrame = 0;
      let needsAnotherFrame = false;

      steps.forEach((step, index) => {
        currentWipes[index] = approach(currentWipes[index], targetWipes[index]);
        currentOffsets[index] = approach(currentOffsets[index], targetOffsets[index]);
        currentScales[index] = approach(currentScales[index], targetScales[index]);

        step.style.setProperty("--house-wipe", `${currentWipes[index]}%`);
        step.style.setProperty("--house-copy-offset", `${currentOffsets[index]}rem`);
        step.style.setProperty("--house-image-scale", `${currentScales[index]}`);

        if (
          Math.abs(targetWipes[index] - currentWipes[index]) >= 0.05 ||
          Math.abs(targetOffsets[index] - currentOffsets[index]) >= 0.05 ||
          Math.abs(targetScales[index] - currentScales[index]) >= 0.0005
        ) {
          needsAnotherFrame = true;
        }
      });

      copyLayers.forEach((copy, index) => {
        currentCopyOffsets[index] = approach(currentCopyOffsets[index], targetCopyOffsets[index]);
        copy.style.setProperty("--house-copy-y", `${currentCopyOffsets[index]}rem`);
        const isVisible = targetCopyOpacity[index] > 0.5;
        copy.setAttribute("aria-hidden", isVisible ? "false" : "true");
        copy.querySelectorAll<HTMLAnchorElement>("a").forEach((link) => {
          link.tabIndex = isVisible ? 0 : -1;
        });

        if (Math.abs(targetCopyOffsets[index] - currentCopyOffsets[index]) >= 0.05) {
          needsAnotherFrame = true;
        }
      });

      if (needsAnotherFrame) {
        renderFrame = window.requestAnimationFrame(renderWipe);
      }
    };

    const measureWipe = () => {
      measureFrame = 0;
      const viewportHeight = Math.max(window.innerHeight, 1);

      if (mobileLayout.matches) {
        steps.forEach((step, index) => {
          targetWipes[index] = 0;
          targetOffsets[index] = 0;
          targetScales[index] = 1;
          targetProgress[index] = index === 0 ? 1 : 0;
        });
        copyLayers.forEach((_, index) => {
          targetCopyOpacity[index] = 1;
          targetCopyOffsets[index] = 0;
        });
        if (!renderFrame) renderFrame = window.requestAnimationFrame(renderWipe);
        return;
      }

      steps.forEach((step, index) => {
        if (index === 0) {
          targetWipes[index] = 0;
          targetOffsets[index] = 0;
          targetScales[index] = 1;
          targetProgress[index] = 1;
          return;
        }

        const rect = step.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / (viewportHeight * 0.9)));
        targetProgress[index] = progress;
        targetWipes[index] = (1 - progress) * 100;
        targetOffsets[index] = (1 - progress) * 2.5;
        targetScales[index] = 1.035 - progress * 0.035;
      });

      copyLayers.forEach((_, index) => {
        const progress = index === 0 ? 1 : targetProgress[index];
        const nextProgress = targetProgress[index + 1] ?? 0;
        const ready = progress >= houseRevealThreshold && nextProgress <= 0;
        targetCopyOpacity[index] = ready ? 1 : 0;
        targetCopyOffsets[index] = ready ? 0 : 1.5;
      });

      if (!renderFrame) {
        renderFrame = window.requestAnimationFrame(renderWipe);
      }
    };

    const settleToHouse = () => {
      snapTimer = undefined;
      if (isSnapping) return;

      const viewportHeight = Math.max(window.innerHeight, 1);
      const sectionRect = section.getBoundingClientRect();
      if (sectionRect.bottom <= viewportHeight * 0.2 || sectionRect.top >= viewportHeight * 0.8) return;
      if (scrollDirection > 0 && sectionRect.bottom <= viewportHeight * 0.72) return;
      if (scrollDirection < 0 && sectionRect.top >= viewportHeight * 0.28) return;

      let targetIndex = 0;
      steps.forEach((step, index) => {
        const rect = step.getBoundingClientRect();
        if (rect.top <= viewportHeight * 0.55 && rect.bottom > viewportHeight * 0.15) {
          targetIndex = index;
        }
      });

      const target = steps[targetIndex];
      if (!target) return;
      const targetTop = target.getBoundingClientRect().top;
      if (Math.abs(targetTop) < 18) return;

      isSnapping = true;
      window.scrollTo({
        top: Math.max(0, window.scrollY + targetTop),
        behavior: reducedMotion ? "auto" : "smooth",
      });
      snapReleaseTimer = window.setTimeout(() => {
        isSnapping = false;
        snapReleaseTimer = undefined;
        measureWipe();
      }, 650);
    };

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY !== lastScrollY) {
        scrollDirection = currentScrollY > lastScrollY ? 1 : -1;
        lastScrollY = currentScrollY;
      }
      if (!measureFrame) {
        measureFrame = window.requestAnimationFrame(measureWipe);
      }
      if (!isSnapping) {
        if (snapTimer) window.clearTimeout(snapTimer);
        snapTimer = window.setTimeout(settleToHouse, snapDelay);
      }
    };

    measureWipe();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      if (renderFrame) window.cancelAnimationFrame(renderFrame);
      if (snapTimer) window.clearTimeout(snapTimer);
      if (snapReleaseTimer) window.clearTimeout(snapReleaseTimer);
    };
  }, [showcaseProperties.length]);

  if (!showcaseProperties.length) {
    return (
      <section id="featured-houses" className={`homepage-house-collection ${className}`.trim()}>
        <div className="homepage-house-collection-container">
          <div className="homepage-house-collection-empty">Our houses will appear here soon.</div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="featured-houses"
      className={`homepage-house-collection homepage-house-showcase-section ${className}`.trim()}
      ref={sectionRef}
    >
      <div className="homepage-house-collection-container">
        <div className="homepage-house-showcase">
          <div className="homepage-house-showcase-copy-layer" aria-label="Current Serenity house">
            {showcaseProperties.map((property, index) => (
              <HouseCopy property={property} index={index} overlay key={`overlay-${property.id || property.slug}`} />
            ))}
          </div>
          <div className="homepage-house-showcase-steps" aria-label="Explore the Serenity homes">
            {showcaseProperties.map((property, index) => {
              const name = displayName(property.name);
              const image = isApprovedHomepageMediaSource(property.featuredImage)
                ? property.featuredImage
                : property.images.find((item) => isApprovedHomepageMediaSource(item.src))?.src || "";

              return (
                <article
                  className="homepage-house-showcase-step"
                  data-house-step
                  data-house-index={index}
                  aria-label={`Serenity ${index + 1}`}
                  key={property.id || property.slug}
                >
                  <HouseCopy property={property} index={index} />
                  <div className="homepage-house-showcase-step-media">
                    {image ? (
                      <Image
                        src={image}
                        alt={`${name} furnished house`}
                        fill
                        sizes="100vw"
                        loading={index === 0 ? "eager" : "lazy"}
                        unoptimized={image.includes("a0.muscache.com") || image.includes(".supabase.co/")}
                      />
                    ) : (
                      <span>House photo coming soon</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
