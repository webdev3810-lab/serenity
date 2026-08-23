"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import StrokeText from "@/src/components/StrokeText";

type GalleryImmersiveIntroImage = {
  src: string;
  alt: string;
  name: string;
};

type GalleryImmersiveIntroProps = {
  images: GalleryImmersiveIntroImage[];
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const sectionProgress = (section: HTMLElement | null) => {
  if (!section) return 0;
  const rect = section.getBoundingClientRect();
  const range = Math.max(1, section.offsetHeight - window.innerHeight);
  return clamp(-rect.top / range);
};

export default function GalleryImmersiveIntro({ images }: GalleryImmersiveIntroProps) {
  const openingRef = useRef<HTMLElement | null>(null);
  const manifestoRef = useRef<HTMLElement | null>(null);
  const [openingProgress, setOpeningProgress] = useState(0);
  const [manifestoProgress, setManifestoProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      setOpeningProgress(sectionProgress(openingRef.current));
      setManifestoProgress(sectionProgress(manifestoRef.current));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const safeImages = images.slice(0, 1);
  const openingScale = reducedMotion ? 1 : 1 + clamp(openingProgress / 0.82) * 0.62;
  const wordmarkOpacity = reducedMotion ? 1 : clamp(1 - openingProgress * 2.1);
  const detailsOpacity = reducedMotion ? 1 : clamp((openingProgress - 0.42) * 3.2);
  const lineOneShift = reducedMotion ? 0 : (0.42 - manifestoProgress) * 34;
  const lineTwoShift = reducedMotion ? 0 : (manifestoProgress - 0.48) * 38;
  const lineThreeShift = reducedMotion ? 0 : (0.5 - manifestoProgress) * 31;

  return (
    <>
      <section ref={openingRef} className="gallery-cinematic-opening" aria-labelledby="gallery-cinematic-title">
        <div className="gallery-cinematic-sticky">
          <div className="gallery-cinematic-image-shell" style={{ transform: `scale(${openingScale})` }}>
            {safeImages.map((image, index) => {
              return (
                <div key={`${image.src}-${index}`} className="gallery-cinematic-image-layer">
                  <Image src={image.src} alt={image.alt} fill priority={index === 0} loading={index === 0 ? "eager" : "lazy"} sizes="100vw" className="object-cover" />
                </div>
              );
            })}
            {!safeImages.length ? <div className="gallery-cinematic-image-fallback" /> : null}
            <div className="gallery-cinematic-shade" />
          </div>

          <div className="gallery-cinematic-wordmark gallery-cinematic-wordmark-gallery" style={{ opacity: wordmarkOpacity, transform: `translate3d(0, ${openingProgress * -5}rem, 0)` }}>
            <h1 id="gallery-cinematic-title">
              <StrokeText
                text="OUR GALLERY"
                strokeColor="#ffffff"
                fillColor="#ffffff"
                strokeWidth={1.15}
                drawDuration={0.9}
                fillDelay={0.08}
                stagger={0.025}
                trigger="mount"
                fillMode="wipe"
                fontSize={180}
                fontWeight={800}
                letterSpacing={-13}
              />
            </h1>
          </div>

          <div className="gallery-cinematic-location" style={{ opacity: clamp(1 - openingProgress * 2.35) }}>
            Pakenham · Victoria
          </div>
          <div className="gallery-cinematic-scroll" style={{ opacity: clamp(1 - openingProgress * 2.35) }}>
            <span>Scroll down</span><span aria-hidden="true">↓</span>
          </div>

          <div className="gallery-cinematic-copy" style={{ opacity: detailsOpacity, transform: `translate3d(0, ${(1 - detailsOpacity) * 3}rem, 0)` }}>
            <p className="gallery-editorial-overline">The Serenity collection</p>
            <h2 className="font-marcellus">A private place to land, breathe, and stay awhile.</h2>
            <p>Three furnished houses beside each other in Pakenham, created for family time, focused work, and longer stays.</p>
          </div>

        </div>
      </section>

      <section ref={manifestoRef} className="gallery-cinematic-manifesto" aria-labelledby="gallery-manifesto-title">
        <div className="gallery-cinematic-manifesto-sticky">
          <p className="gallery-cinematic-chapter">Chapter one <span>The collection</span> <span>(1)</span></p>
          <h2 id="gallery-manifesto-title" className="gallery-cinematic-manifesto-lines" aria-label="Three private homes, side by side, room to settle in">
            <span style={{ transform: `translate3d(${lineOneShift}vw, 0, 0)` }}>THREE PRIVATE HOMES</span>
            <span style={{ transform: `translate3d(${lineTwoShift}vw, 0, 0)` }}>SIDE BY SIDE</span>
            <span style={{ transform: `translate3d(${lineThreeShift}vw, 0, 0)` }}>ROOM TO SETTLE IN</span>
          </h2>
          <div className="gallery-cinematic-manifesto-copy" style={{ opacity: reducedMotion ? 1 : clamp((manifestoProgress - 0.58) * 3.8), transform: `translate3d(0, ${(1 - clamp((manifestoProgress - 0.58) * 3.8)) * 2.5}rem, 0)` }}>
            <p className="gallery-editorial-overline">Serenity On The Rocks</p>
            <p>Move from the houses into their rooms. Every image below comes from the approved Serenity photo library and follows the order set in the admin.</p>
          </div>
        </div>
      </section>

      <section className="gallery-cinematic-chapter-intro">
        <div>
          <p className="gallery-editorial-overline">Discover the houses</p>
          <h2 className="font-marcellus">Meet the Serenity collection.</h2>
        </div>
        <p>Select a home to begin. Hover across the list for a preview, then open its complete room-by-room gallery.</p>
      </section>
    </>
  );
}
