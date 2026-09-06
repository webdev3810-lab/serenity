"use client";

import { useRef, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowRight, Quote, Star } from "lucide-react";
import type { HomepageReview } from "./HomepageReviewsSection";

export default function HomepageReviewsCarousel({ reviews, fullBleed = true }: { reviews: HomepageReview[]; fullBleed?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    dragged: false,
    axis: null as "x" | "y" | null,
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
    if (!track || Math.abs(initialVelocity) < 0.04) return;

    let velocity = Math.max(-2.5, Math.min(2.5, initialVelocity));
    let lastFrameAt = performance.now();
    const step = (now: number) => {
      const elapsed = Math.min(Math.max(now - lastFrameAt, 8), 32);
      lastFrameAt = now;
      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, track.scrollLeft + velocity * elapsed));
      track.scrollLeft = nextScrollLeft;
      velocity *= Math.pow(0.94, elapsed / 16);

      if (Math.abs(velocity) < 0.04 || nextScrollLeft === 0 || nextScrollLeft === maxScrollLeft) {
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
      startY: event.clientY,
      startScrollLeft: trackRef.current.scrollLeft,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      dragged: false,
      axis: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const state = dragRef.current;
    if (state.pointerId !== event.pointerId) return;

    const distanceX = event.clientX - state.startX;
    const distanceY = event.clientY - state.startY;
    if (!state.axis && Math.max(Math.abs(distanceX), Math.abs(distanceY)) > 4) {
      state.axis = Math.abs(distanceX) >= Math.abs(distanceY) ? "x" : "y";
      if (state.axis === "y" && event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
    if (state.axis !== "x") return;

    state.dragged = true;
    trackRef.current.scrollLeft = state.startScrollLeft - distanceX;
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
    <div className={`relative mt-14 mb-10 sm:mt-16 sm:mb-12 ${fullBleed ? "w-[calc(100%+3rem)] -mx-6 sm:w-[calc(100%+5rem)] sm:-mx-10 lg:w-[calc(100%+8rem)] lg:-mx-16" : "w-full"}`}>
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
        aria-label="Guest reviews"
        className="flex w-full cursor-grab gap-4 select-none overflow-x-auto overscroll-x-contain px-6 pb-3 pt-4 active:cursor-grabbing sm:gap-5 sm:px-10 lg:px-16"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", touchAction: "pan-y", WebkitOverflowScrolling: "touch", scrollBehavior: "auto" }}
      >
        {reviews.map((review, index) => {
          const featured = index % 3 === 0;
          const quoteLength = review.reviewText.replace(/\s+/g, " ").trim().length;
          const quoteSize = quoteLength > 360
            ? "text-[0.96rem] leading-[1.45] tracking-[-0.005em]"
            : quoteLength > 280
              ? "text-[1rem] leading-[1.42] tracking-[-0.008em]"
              : quoteLength > 200
                ? "text-[1.05rem] leading-[1.38] tracking-[-0.01em]"
                : quoteLength > 140
                  ? "text-[1.1rem] leading-[1.34] tracking-[-0.012em]"
                  : quoteLength > 90
                    ? "text-[1.16rem] leading-[1.28] tracking-[-0.015em]"
                    : "text-[clamp(1.2rem,1.6vw,1.45rem)] leading-[1.2] tracking-[-0.02em]";
          return (
            <div key={review.id} className="flex w-[84vw] max-w-[30rem] flex-shrink-0 sm:w-[22rem] sm:max-w-[22rem] md:w-[24rem] md:max-w-[24rem]">
              <article className={`group relative flex h-auto min-h-[28rem] w-full overflow-hidden border shadow-[0_24px_60px_-42px_rgba(45,37,33,0.7)] transition-[transform,box-shadow] duration-500 hover:-translate-y-2 hover:shadow-[0_28px_65px_-38px_rgba(45,37,33,0.42)] sm:min-h-[22rem] md:min-h-[24rem] ${featured ? "border-[#5A463A] bg-[#2D2521] text-[#F7F4F1]" : "border-[#DDD1C8] bg-[#FFFEFC] text-stone-900"}`}>
                <div className="flex min-w-0 w-full flex-col p-6 sm:p-7">
                  <div className="flex min-w-0 items-center justify-between gap-4 border-b border-current/15 pb-5 text-[10px] font-bold uppercase tracking-[0.18em]">
                    <span className={`min-w-0 ${featured ? "text-[#DCC9BA]" : "text-[#8B6B55]"}`}>{String(index + 1).padStart(2, "0")} <span className="mx-1 text-current/45">/</span> guest note</span>
                    <time className={`shrink-0 ${featured ? "text-[#F7F4F1]/60" : "text-stone-400"}`}>{review.reviewDateLabel ?? review.reviewDate ?? ""}</time>
                  </div>

                  <div className="mt-6 flex min-w-0 items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex gap-0.5 text-[#E0AD38]" aria-label="Five-star guest review">
                        {Array.from({ length: 5 }, (_, star) => <Star key={star} size={12} fill="currentColor" strokeWidth={0} aria-hidden="true" />)}
                      </div>
                      <span className={`inline-flex max-w-full break-words px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${featured ? "bg-[#F7F4F1]/10 text-[#F7F4F1]" : "bg-[#F0E8E1] text-[#5A463A]"}`}>
                        {review.propertyName}
                      </span>
                    </div>
                    <Quote size={31} strokeWidth={1.1} className={`shrink-0 ${featured ? "text-[#B99D88]" : "text-[#C8B5A8]"}`} aria-hidden="true" />
                  </div>

                  <h3 className={`homepage-review-quote display-font mt-7 min-w-0 flex-1 break-words [overflow-wrap:anywhere] ${quoteSize} ${featured ? "text-[#F7F4F1]" : "text-stone-900"}`}>
                    &ldquo;{review.reviewText}&rdquo;
                  </h3>

                  <div className="mt-auto flex items-end justify-between gap-4 border-t border-current/15 pt-7">
                    <div className="min-w-0">
                      <p className="break-words text-[11px] font-bold uppercase tracking-[0.18em]">{review.reviewerName}</p>
                      <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.15em] ${featured ? "text-[#F7F4F1]/55" : "text-stone-400"}`}>Verified guest</p>
                    </div>
                    <Link href={`/properties/${review.propertySlug}`} className={`group/link inline-flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${featured ? "text-[#F7F4F1]/65 hover:text-[#F7F4F1]" : "text-stone-400 hover:text-[#B88A5A]"}`}>
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
