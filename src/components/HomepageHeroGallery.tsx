"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";

export type HomepageHeroImage = {
  type?: "image" | "video";
  src: string;
  alt: string;
  caption?: string;
  poster?: string;
};

type HomepageHeroGalleryProps = {
  images: HomepageHeroImage[];
  heading?: string;
  tagline?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

const isPreviewImage = (src: string) => src.includes("a0.muscache.com");
const isSupabaseImage = (src: string) => src.includes(".supabase.co/");

export default function HomepageHeroGallery({
  images,
  heading = "Whole-home stays.",
  tagline = "Business-ready.",
  ctaLabel = "Request corporate rates",
  ctaHref = "/corporate-stays",
}: HomepageHeroGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion || images.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [images.length, reducedMotion]);

  useEffect(() => {
    images.forEach((image, index) => {
      const video = videoRefs.current[index];
      if (!video) return;
      if (index !== activeIndex || reducedMotion) {
        video.pause();
        return;
      }
      void video.play().catch(() => undefined);
    });
  }, [activeIndex, images, reducedMotion]);

  const heroStats = [
    { value: "3", label: "ADJACENT HOMES", href: "/houses" },
    { value: "9 min", label: "WALK TO PAKENHAM STATION", href: "/contact#location-map" },
    { value: "8+ yrs", label: "HOSTING EXPERIENCE", href: "/about#guest-reviews" },
    { value: "1 contact", label: "ENQUIRY TO CHECKOUT", href: "/contact" },
  ] as const;

  return (
    <section className="serenity-hero" aria-labelledby="homepage-hero-title">
      <div className="serenity-hero-media" aria-hidden="true">
        {images.map((image, index) => {
          const previewImage = isPreviewImage(image.src);
          const directImage = previewImage;
          const isActive = index === activeIndex;
          const isVideo = image.type === "video";
          return (
            <div
              key={`${image.src}-${index}`}
              className={`serenity-hero-image ${isActive ? "is-active" : ""}`}
            >
              {isVideo ? (
                isActive ? (
                  <video
                    ref={(node) => { videoRefs.current[index] = node; }}
                    className="serenity-hero-image-asset"
                    src={image.src}
                    poster={image.poster}
                    muted
                    loop
                    playsInline
                    autoPlay={!reducedMotion}
                    preload={index === 0 ? "metadata" : "none"}
                    aria-hidden="true"
                  />
                ) : image.poster ? (
                  <Image
                    src={image.poster}
                    alt=""
                    fill
                    priority={index === 0}
                    loading="eager"
                    sizes="100vw"
                    unoptimized={isPreviewImage(image.poster)}
                    className="serenity-hero-image-asset"
                  />
                ) : null
              ) : (
                <Image
                  src={image.src}
                  alt=""
                  fill
                  priority={index === 0}
                  loading="eager"
                  unoptimized={directImage}
                  referrerPolicy={previewImage ? "no-referrer" : undefined}
                  sizes="100vw"
                  className="serenity-hero-image-asset"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="serenity-hero-smoke" aria-hidden="true" />

      <div className="serenity-hero-shell">
        <div className="serenity-hero-copy">
          <p className="serenity-hero-eyebrow">CORPORATE ACCOMMODATION · SOUTH-EAST MELBOURNE</p>
          <h1 id="homepage-hero-title" className="serenity-hero-title">
            <span className="serenity-hero-title-main">{heading}</span>
            <span className="serenity-hero-title-sub">{tagline}</span>
          </h1>
          <p className="serenity-hero-support">
            Furnished private homes for project teams, relocations and insurance stays—managed locally, with flexible terms and one responsive point of contact.
          </p>
          <div className="serenity-hero-actions">
            <Link href={ctaHref} className="serenity-hero-cta">
              {ctaLabel} <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="#featured-houses" className="serenity-hero-text-link">
              Explore the homes <ArrowDown size={15} aria-hidden="true" />
            </Link>
          </div>

        </div>

        <div className="serenity-hero-stats" aria-label="Serenity stay highlights">
          {heroStats.map(({ value, label, href }) => (
            <Link className="serenity-hero-stat" href={href} key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
