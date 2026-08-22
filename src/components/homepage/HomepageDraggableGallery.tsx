"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

const AUTOPLAY_STEP = 1;
const AUTOPLAY_INTERVAL_MS = 16;

export interface HomepageDraggableGalleryImage {
  src: string;
  alt: string;
  label?: string;
}

interface DraggableGalleryProps {
  images: Array<HomepageDraggableGalleryImage | string>;
}

export default function HomepageDraggableGallery({ images }: DraggableGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const autoplayIntervalRef = useRef<number | null>(null);
  const hoverPausedRef = useRef(false);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });

  const normalizedImages = useMemo(
    () => images.map((image) => (typeof image === "string" ? { src: image, alt: "Serenity property" } : image)),
    [images],
  );

  const baseImages = useMemo(() => {
    const seen = new Set<string>();

    return normalizedImages.filter((image) => {
      const source = image.src.trim();
      if (!isApprovedHomepageMediaSource(source) || seen.has(source)) return false;
      seen.add(source);
      return true;
    });
  }, [normalizedImages]);

  const loopImages = useMemo(
    () => [...baseImages, ...baseImages, ...baseImages],
    [baseImages],
  );

  const getLoopWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track || !baseImages.length) return 0;

    const secondCopy = track.children[baseImages.length] as HTMLElement | undefined;
    if (!secondCopy) return track.scrollWidth / 3;

    const trackBounds = track.getBoundingClientRect();
    return secondCopy.getBoundingClientRect().left - trackBounds.left + track.scrollLeft;
  }, [baseImages.length]);

  const recenterTrack = useCallback(() => {
    const track = trackRef.current;
    const loopWidth = getLoopWidth();
    if (!track || !loopWidth) return;

    if (track.scrollLeft <= loopWidth * 0.18) {
      track.scrollLeft += loopWidth;
    } else if (track.scrollLeft >= loopWidth * 1.82) {
      track.scrollLeft -= loopWidth;
    }
  }, [getLoopWidth]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !baseImages.length) return;

    const initialFrame = window.requestAnimationFrame(() => {
      const loopWidth = getLoopWidth();
      if (loopWidth) track.scrollLeft = loopWidth;
    });

    const autoScroll = () => {
      const isHovered = hoverPausedRef.current && track.matches(":hover");

      if (
        !dragRef.current.active &&
        !isHovered
      ) {
        track.scrollLeft += AUTOPLAY_STEP;
        recenterTrack();
      }
    };

    autoplayIntervalRef.current = window.setInterval(autoScroll, AUTOPLAY_INTERVAL_MS);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      if (autoplayIntervalRef.current) window.clearInterval(autoplayIntervalRef.current);
      autoplayIntervalRef.current = null;
    };
  }, [baseImages.length, getLoopWidth, recenterTrack]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;

    if (event.pointerType === "touch") hoverPausedRef.current = false;
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startScrollLeft: track.scrollLeft,
    };
    track.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || !dragRef.current.active) return;

    event.preventDefault();
    track.scrollLeft = dragRef.current.startScrollLeft - (event.clientX - dragRef.current.startX) * 1.15;

    const loopWidth = getLoopWidth();
    if (loopWidth && track.scrollLeft <= loopWidth * 0.08) {
      track.scrollLeft += loopWidth;
      dragRef.current.startScrollLeft += loopWidth;
    } else if (loopWidth && track.scrollLeft >= loopWidth * 1.92) {
      track.scrollLeft -= loopWidth;
      dragRef.current.startScrollLeft -= loopWidth;
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || !dragRef.current.active) return;

    dragRef.current.active = false;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      track.scrollBy({ left: event.key === "ArrowRight" ? 260 : -260, behavior: "smooth" });
    }
  };

  if (!baseImages.length) return null;

  return (
    <section className="homepage-photo-rail" aria-labelledby="homepage-photo-rail-heading">
      <div className="homepage-photo-rail-intro">
        <div>
          <p className="homepage-photo-rail-eyebrow">Inside Serenity</p>
          <h2 id="homepage-photo-rail-heading">A closer look at your next stay.</h2>
        </div>
        <p className="homepage-photo-rail-instruction">
          Drag to explore every room. The gallery keeps moving gently until you hover.
        </p>
      </div>

      <div
        ref={trackRef}
        className="homepage-photo-rail-track"
        role="region"
        aria-label="Serenity house photo carousel"
        tabIndex={0}
        onMouseEnter={() => {
          hoverPausedRef.current = true;
        }}
        onMouseLeave={() => {
          hoverPausedRef.current = false;
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className="homepage-photo-rail-track-inner">
          {loopImages.map((image, index) => {
            const copyIndex = Math.floor(index / baseImages.length);

            return (
              <figure
                key={`${image.src}-${index}`}
                className="homepage-photo-rail-card"
                aria-hidden={copyIndex > 0}
              >
                <div className="homepage-photo-rail-image">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    draggable={false}
                    sizes="(max-width: 640px) 82vw, (max-width: 1024px) 42vw, 30vw"
                    className="object-cover"
                    unoptimized={image.src.includes(".supabase.co/")}
                  />
                </div>
                {image.label ? <figcaption>{image.label}</figcaption> : null}
              </figure>
            );
          })}
        </div>
      </div>

      <p className="homepage-photo-rail-note" aria-hidden="true">
        Hover to pause <span>·</span> Drag left or right
      </p>
    </section>
  );
}
