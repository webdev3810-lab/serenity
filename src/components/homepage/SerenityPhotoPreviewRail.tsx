"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type PointerEvent, type SyntheticEvent } from "react";
import type { CSSProperties } from "react";
import type { SerenityEditorialPreviewImage } from "./SerenityEditorialHome";

type SerenityPhotoPreviewRailProps = {
  photos: SerenityEditorialPreviewImage[];
  duration: string;
};

type DragState = {
  pointerId: number;
  startX: number;
  startTime: number;
  duration: number;
  travelDistance: number;
  moved: boolean;
  animation: Animation;
};

function Photo({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={src.includes("a0.muscache.com") || src.includes(".supabase.co/")}
    />
  );
}

export default function SerenityPhotoPreviewRail({ photos, duration }: SerenityPhotoPreviewRailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const animation = track?.getAnimations()[0];
    if (!viewport || !track || !animation) return;

    const durationMs = animation.effect?.getTiming().duration;
    const duration = typeof durationMs === "number" ? durationMs : Number.parseFloat(getComputedStyle(track).animationDuration) * 1000;
    if (!Number.isFinite(duration) || duration <= 0) return;

    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startTime: Number(animation.currentTime ?? 0),
      duration,
      travelDistance: Math.max(track.scrollWidth / 2, 1),
      moved: false,
      animation,
    };
    viewport.classList.add("is-dragging");
    // Capture on the pressed card when possible, so an ordinary click still
    // targets its link after pointer capture ends.
    const captureTarget = event.target instanceof Element
      ? event.target.closest<HTMLElement>("a") ?? viewport
      : viewport;
    captureTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(deltaX) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.startX = event.clientX;
      drag.startTime = Number(drag.animation.currentTime ?? drag.startTime);
      drag.animation.pause();
      viewportRef.current?.classList.add("is-dragging");
      return;
    }
    drag.moved = true;
    const nextTime = drag.startTime - (deltaX / drag.travelDistance) * drag.duration;
    drag.animation.currentTime = ((nextTime % drag.duration) + drag.duration) % drag.duration;
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved) {
      suppressClickRef.current = true;
    }
    if (drag.moved) drag.animation.play();
    dragRef.current = null;
    viewportRef.current?.classList.remove("is-dragging");
  };

  const handleClickCapture = (event: SyntheticEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  const trackStyle = { "--photo-preview-duration": duration } as CSSProperties;
  const imageSizes = "(min-width: 1200px) 30vw, (min-width: 760px) 44vw, 82vw";

  const renderPhoto = (photo: SerenityEditorialPreviewImage, duplicate = false) => {
    const media = (
      <div className="serenity-editorial-photo-preview__media">
        <Photo src={photo.src} alt={duplicate ? "" : photo.alt} sizes={imageSizes} />
        <span className="serenity-editorial-photo-preview__caption">
          <strong>{photo.houseName}</strong>
          <small>View house <span aria-hidden="true">↗</span></small>
        </span>
      </div>
    );

    return duplicate ? (
      <div className="serenity-editorial-photo-preview__card" key={`loop-${photo.slug}-${photo.src}`}>
        {media}
      </div>
    ) : (
      <Link
        className="serenity-editorial-photo-preview__card"
        href={`/properties/${photo.slug}`}
        key={`${photo.slug}-${photo.src}`}
        aria-label={`View ${photo.houseName}, photo ${photo.photoNumber}`}
        draggable={false}
      >
        {media}
      </Link>
    );
  };

  return (
    <div
      ref={viewportRef}
      className="serenity-editorial-photo-preview__viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClickCapture={handleClickCapture}
    >
      <div ref={trackRef} className="serenity-editorial-photo-preview__track" style={trackStyle}>
        <div className="serenity-editorial-photo-preview__group">
          {photos.map((photo) => renderPhoto(photo))}
        </div>
        <div className="serenity-editorial-photo-preview__group" aria-hidden="true">
          {photos.map((photo) => renderPhoto(photo, true))}
        </div>
      </div>
    </div>
  );
}
