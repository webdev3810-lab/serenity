"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type SerenityHeroSlide = {
  src: string;
  alt: string;
  type: "image" | "video";
};

export default function SerenityHeroImage({ slides }: { slides: SerenityHeroSlide[] }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [activeSlide, setActiveSlide] = useState(0);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const firstSlide = slides[0];
  const currentSlide = slides[activeSlide] ?? firstSlide;

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([key, video]) => {
      if (!video) return;
      if (Number(key) === activeSlide) {
        video.currentTime = 0;
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeSlide]);

  useEffect(() => {
    if (slides.length < 2 || currentSlide?.type !== "image" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timeout = window.setTimeout(() => setActiveSlide((index) => (index + 1) % slides.length), 5000);
    return () => window.clearTimeout(timeout);
  }, [activeSlide, currentSlide?.type, slides.length]);

  if (!firstSlide?.src) return <div className="serenity-editorial-image-fallback" aria-hidden="true" />;

  const goToSlide = (index: number) => setActiveSlide((index + slides.length) % slides.length);
  const goToNextSlide = () => setActiveSlide((index) => (index + 1) % slides.length);

  return (
    <>
      <div className="serenity-editorial-hero__media" data-state={state}>
        {slides.map((slide, index) => {
          const isActive = index === activeSlide;

          return slide.type === "image" ? (
            <Image
              key={`${slide.src}-${index}`}
              className={index === 0 ? "serenity-editorial-hero__base-image" : "serenity-editorial-hero__slide-image"}
              data-active={isActive}
              src={slide.src}
              alt={isActive ? slide.alt : ""}
              aria-hidden={!isActive}
              fill
              preload={index === 0}
              loading={index === 0 ? undefined : "eager"}
              sizes="100vw"
              unoptimized={slide.src.includes("a0.muscache.com") || slide.src.includes(".supabase.co/")}
              onLoad={index === 0 ? () => setState("loaded") : undefined}
              onError={index === 0 ? () => setState("error") : undefined}
            />
          ) : (
            <video
              key={`${slide.src}-${index}`}
              ref={(video) => { videoRefs.current[index] = video; }}
              className="serenity-editorial-hero__video"
              data-active={isActive}
              muted
              playsInline
              autoPlay={isActive}
              loop={slides.length === 1}
              preload={index === 0 ? "auto" : "metadata"}
              aria-hidden="true"
              tabIndex={-1}
              onLoadedData={index === 0 ? () => setState("loaded") : undefined}
              onEnded={() => { if (isActive) goToNextSlide(); }}
              onError={() => { if (index === 0) setState("error"); else if (isActive) goToNextSlide(); }}
            >
              <source src={slide.src} />
            </video>
          );
        })}
        <div className="serenity-editorial-hero__loading" aria-hidden="true">
          <span className="serenity-editorial-hero__loading-name">Serenity</span>
          <span className="serenity-editorial-hero__loading-track" />
        </div>
      </div>
      {slides.length > 1 && (
        <div className="serenity-editorial-hero__controls" role="group" aria-label="Hero media carousel">
          <button className="serenity-editorial-hero__arrow serenity-editorial-hero__arrow--previous" type="button" onClick={() => goToSlide(activeSlide - 1)} aria-label="Previous hero media">
            <ChevronLeft size={24} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div className="serenity-editorial-hero__pagination" role="group" aria-label="Choose hero media">
            {slides.map((slide, index) => (
              <button
                key={`${slide.src}-${index}`}
                className="serenity-editorial-hero__dot"
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Show hero media ${index + 1} of ${slides.length}`}
                aria-current={index === activeSlide ? "true" : undefined}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
          <button className="serenity-editorial-hero__arrow serenity-editorial-hero__arrow--next" type="button" onClick={() => goToSlide(activeSlide + 1)} aria-label="Next hero media">
            <ChevronRight size={24} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
