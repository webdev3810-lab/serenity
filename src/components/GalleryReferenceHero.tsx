"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type GalleryReferenceHeroProps = {
  items?: Array<{
    img: string;
    alt?: string;
    category?: string;
  }>;
};

const isPreviewImage = (src: string) => src.includes("a0.muscache.com");

export default function GalleryReferenceHero({ items = [] }: GalleryReferenceHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const storyItems = items;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      if (reducedMotion.matches) {
        setProgress(0);
        return;
      }

      const bounds = section.getBoundingClientRect();
      const scrollRange = Math.max(1, bounds.height - window.innerHeight);
      const nextProgress = Math.min(1, Math.max(0, -bounds.top / scrollRange));
      setProgress(nextProgress);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    reducedMotion.addEventListener("change", onScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reducedMotion.removeEventListener("change", onScroll);
    };
  }, []);

  const textShift = (progress - 0.5) * 8;
  const activePosition = storyItems.length > 1 ? progress * (storyItems.length - 1) : 0;
  const globalImageScale = 0.82 + progress * 1.2;
  const storyHeight = Math.max(125, Math.min(960, 100 + storyItems.length * 24));

  return (
    <section
      ref={sectionRef}
      className="gallery-reference-hero"
      style={{ "--gallery-reference-story-height": `${storyHeight}svh` } as CSSProperties}
      aria-labelledby="gallery-reference-title"
    >
      <div className="gallery-reference-hero-sticky">
        <div className="gallery-reference-wordmark" style={{ transform: `translate3d(${textShift}%, 0, 0) scale(${1 + progress * 0.08})` }}>
          <h1 id="gallery-reference-title">SERENITY HOUSES</h1>
        </div>

        {storyItems.map((item, index) => {
          const distance = Math.abs(index - activePosition);
          const opacity = Math.max(0, 1 - distance * 1.35);
          const translateY = (index - activePosition) * 2.5;
          const scale = globalImageScale * (1 + Math.min(distance, 1) * 0.05);
          const previewImage = isPreviewImage(item.img);

          return (
            <div
              key={`${item.img}-${index}`}
              className="gallery-reference-slide"
              style={{ opacity, transform: `translate3d(0, ${translateY}%, 0) scale(${scale})` }}
              aria-hidden={opacity < 0.4}
            >
              <div className="gallery-reference-image-frame">
                <Image
                  src={item.img}
                  alt={item.alt ?? "Serenity house"}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? "eager" : "lazy"}
                  unoptimized={previewImage}
                  referrerPolicy={previewImage ? "no-referrer" : undefined}
                  sizes="(max-width: 767px) 78vw, 42vw"
                  className="gallery-reference-image"
                />
                <span className="gallery-reference-slide-caption">
                  <strong>{item.category ?? "Serenity house"}</strong>
                  <small>{String(index + 1).padStart(2, "0")} / {storyItems.length}</small>
                </span>
              </div>
            </div>
          );
        })}

        <p className="gallery-reference-scroll-cue">Scroll to explore</p>
      </div>
    </section>
  );
}
