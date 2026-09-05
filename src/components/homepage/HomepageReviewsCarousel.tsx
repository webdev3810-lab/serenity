"use client";

import { useRef, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowRight, Quote, Star } from "lucide-react";
import type { HomepageReview } from "./HomepageReviewsSection";

export default function HomepageReviewsCarousel({ reviews }: { reviews: HomepageReview[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    startScrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    dragged: false,
  });
  const momentumFrameRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const stopMomentum = () => {
    if (momentumFrameRef.current !== null) {
      window.cancelAnimationFrame(momentumFrameRef.current);
      momentumFrameRef.current = null;
    }
  };

  const continueMomentum = (initialVelocity: number) => {
    const track = trackRef.current;
    if (!track || Math.abs(initialVelocity) < 0.08) return;

    let velocity = initialVelocity;
    const step = () => {
      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, track.scrollLeft + velocity * 16));
      track.scrollLeft = nextScrollLeft;
      velocity *= 0.93;

      if (Math.abs(velocity) < 0.08 || nextScrollLeft === 0 || nextScrollLeft === maxScrollLeft) {
        momentumFrameRef.current = null;
        return;
      }
      momentumFrameRef.current = window.requestAnimationFrame(step);
    };

    momentumFrameRef.current = window.requestAnimationFrame(step);
  };

  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!trackRef.current) return;
    stopMomentum();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: trackRef.current.scrollLeft,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      dragged: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const state = dragRef.current;
    if (state.pointerId !== event.pointerId) return;

    const distance = event.clientX - state.startX;
    if (Math.abs(distance) > 4) state.dragged = true;
    trackRef.current.scrollLeft = state.startScrollLeft - distance;
    const elapsed = Math.max(event.timeStamp - state.lastTime, 1);
    const currentVelocity = -(event.clientX - state.lastX) / elapsed;
    state.velocity = state.velocity * 0.7 + currentVelocity * 0.3;
    state.lastX = event.clientX;
    state.lastTime = event.timeStamp;
    event.preventDefault();
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (state.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (state.dragged) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      continueMomentum(state.velocity);
    }
    dragRef.current.pointerId = null;
  };

  return (
    <div className="relative mt-14 mb-10 w-[calc(100%+3rem)] -mx-6 sm:mt-16 sm:mb-12 sm:w-[calc(100%+5rem)] sm:-mx-10 lg:w-[calc(100%+8rem)] lg:-mx-16">
      <div 
        ref={trackRef}
        onPointerDown={beginDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClickRef.current = false;
        }}
        className="flex w-full cursor-grab gap-5 select-none overflow-x-auto overscroll-x-contain px-6 pb-3 pt-4 active:cursor-grabbing sm:px-10 lg:px-16"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
      >
        {reviews.map((review, index) => {
          const featured = index % 3 === 0;
          const quoteLength = review.reviewText.replace(/\s+/g, " ").trim().length;
          const quoteSize = quoteLength > 300
            ? "text-[0.68rem] leading-[1.3] tracking-[-0.01em]"
            : quoteLength > 200
              ? "text-[0.78rem] leading-[1.28] tracking-[-0.012em]"
              : quoteLength > 140
                ? "text-[0.9rem] leading-[1.26] tracking-[-0.015em]"
                : quoteLength > 100
                  ? "text-[1rem] leading-[1.24] tracking-[-0.017em]"
                  : quoteLength > 65
                    ? "text-[1.12rem] leading-[1.22] tracking-[-0.018em]"
                    : "text-[clamp(1.2rem,1.6vw,1.45rem)] leading-[1.2] tracking-[-0.02em]";
          return (
            <div key={review.id} className="flex w-[78vw] max-w-[22rem] flex-shrink-0 sm:w-[22rem]">
              <article className={`group relative flex aspect-square w-full overflow-hidden border shadow-[0_24px_60px_-42px_rgba(45,37,33,0.7)] transition-[transform,box-shadow] duration-500 hover:-translate-y-2 hover:shadow-[0_28px_65px_-38px_rgba(45,37,33,0.42)] ${featured ? "border-[#5A463A] bg-[#2D2521] text-[#F7F4F1]" : "border-[#DDD1C8] bg-[#FFFEFC] text-stone-900"}`}>
                <div className="flex w-full flex-col p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-4 border-b border-current/15 pb-5 text-[10px] font-bold uppercase tracking-[0.18em]">
                    <span className={featured ? "text-[#DCC9BA]" : "text-[#8B6B55]"}>{String(index + 1).padStart(2, "0")} <span className="mx-1 text-current/45">/</span> guest note</span>
                    <time className={featured ? "text-[#F7F4F1]/60" : "text-stone-400"}>{review.reviewDateLabel ?? review.reviewDate ?? ""}</time>
                  </div>

                  <div className="mt-6 flex items-start justify-between gap-4">
                    <div>
                      <div className={`mb-3 flex gap-0.5 ${featured ? "text-[#DCC9BA]" : "text-[#B88A5A]"}`} aria-label="Five-star guest review">
                        {Array.from({ length: 5 }, (_, star) => <Star key={star} size={12} fill="currentColor" strokeWidth={0} aria-hidden="true" />)}
                      </div>
                      <span className={`inline-flex px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${featured ? "bg-[#F7F4F1]/10 text-[#F7F4F1]" : "bg-[#F0E8E1] text-[#5A463A]"}`}>
                        {review.propertyName}
                      </span>
                    </div>
                    <Quote size={31} strokeWidth={1.1} className={featured ? "text-[#B99D88]" : "text-[#C8B5A8]"} aria-hidden="true" />
                  </div>

                  <h3 className={`homepage-review-quote display-font mt-7 break-words ${quoteSize} ${featured ? "text-[#F7F4F1]" : "text-stone-900"}`}>
                    &ldquo;{review.reviewText}&rdquo;
                  </h3>

                  <div className="mt-auto flex items-end justify-between gap-4 border-t border-current/15 pt-7">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{review.reviewerName}</p>
                      <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.15em] ${featured ? "text-[#F7F4F1]/55" : "text-stone-400"}`}>Verified guest</p>
                    </div>
                    <Link href={`/properties/${review.propertySlug}`} className={`group/link inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${featured ? "text-[#F7F4F1]/65 hover:text-[#F7F4F1]" : "text-stone-400 hover:text-[#B88A5A]"}`}>
                      View stay
                      <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-1" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
}
