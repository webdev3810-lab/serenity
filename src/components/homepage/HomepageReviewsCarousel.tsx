"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import type { HomepageReview } from "./HomepageReviewsSection";

export default function HomepageReviewsCarousel({ reviews }: { reviews: HomepageReview[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const handleScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    const maxScroll = scrollWidth - clientWidth;
    setProgress(maxScroll > 0 ? scrollLeft / maxScroll : 0);
  };

  const scrollBy = (direction: 1 | -1) => {
    if (!trackRef.current) return;
    const scrollAmount = trackRef.current.clientWidth * 0.8;
    trackRef.current.scrollBy({ left: scrollAmount * direction, behavior: "smooth" });
  };

  // Hydration sync
  useEffect(() => {
    handleScroll();
  }, []);

  return (
    <div className="w-full relative mt-16 mb-20">
      {/* Track */}
      <div 
        ref={trackRef}
        onScroll={handleScroll}
        className="flex w-full overflow-x-auto snap-x snap-mandatory no-scrollbar pb-12 pt-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="w-[5vw] md:w-[15vw] flex-shrink-0" /> {/* Left padding spacer */}
        
        {reviews.map((review, index) => {
          const featured = index % 3 === 0;
          return (
            <div key={review.id} className="snap-center flex-shrink-0 w-[86vw] sm:w-[64vw] md:w-[48vw] lg:w-[38vw] xl:w-[31vw] mr-5 sm:mr-7 flex">
              <div className={`group relative flex min-h-[24rem] w-full overflow-hidden rounded-none border shadow-[0_20px_55px_-38px_rgba(45,37,33,0.65)] transition-transform duration-500 hover:-translate-y-2 ${featured ? "border-[#5A463A] bg-[#2D2521] text-[#F7F4F1]" : "border-[#DDD1C8] bg-[#FBF9F7] text-stone-900"}`}>
                <div className="flex w-full flex-col p-7 sm:min-h-[26rem] sm:p-9">
                  <div className="flex items-center justify-between gap-4 border-b border-current/15 pb-5 text-[10px] font-bold uppercase tracking-[0.18em]">
                    <span className={featured ? "text-[#D2C0B4]" : "text-[#8B6B55]"}>{String(index + 1).padStart(2, "0")} / guest note</span>
                    <span className={featured ? "text-[#F7F4F1]/60" : "text-stone-400"}>{review.reviewDateLabel ?? review.reviewDate ?? ""}</span>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <span className={`rounded-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${featured ? "bg-[#F7F4F1]/10 text-[#F7F4F1]" : "bg-[#F0E8E1] text-[#5A463A]"}`}>
                      {review.propertyName}
                    </span>
                    <Quote size={28} strokeWidth={1.2} className={featured ? "text-[#B99D88]" : "text-[#C8B5A8]"} aria-hidden="true" />
                  </div>

                  <h3 className={`homepage-review-quote display-font mt-8 line-clamp-5 text-[clamp(1.65rem,2.5vw,2.5rem)] leading-[1.08] ${featured ? "text-[#F7F4F1]" : "text-stone-900"}`}>
                    &ldquo;{review.reviewText}&rdquo;
                  </h3>

                  <div className="mt-auto flex items-end justify-between gap-4 border-t border-current/15 pt-7">
                    <div className="flex items-center gap-3">
                      <span className={`h-px w-8 ${featured ? "bg-[#B99D88]" : "bg-[#B88A5A]"}`} aria-hidden="true" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{review.reviewerName}</p>
                    </div>
                    <Link href={`/properties/${review.propertySlug}`} className={`group/link inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${featured ? "text-[#F7F4F1]/65 hover:text-[#F7F4F1]" : "text-stone-400 hover:text-[#B88A5A]"}`}>
                      View house
                      <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-1" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="w-[5vw] md:w-[15vw] flex-shrink-0" /> {/* Right padding spacer */}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto px-6 sm:px-12">
        <button onClick={() => scrollBy(-1)} className="p-3 rounded-none border border-stone-200 bg-white hover:bg-[#F4F0EA] hover:border-[#D2C0B4] transition-all duration-300 shadow-sm hover:shadow-md" aria-label="Previous">
          <ArrowLeft size={18} strokeWidth={1.5} className="text-stone-800" />
        </button>
        
        {/* Progress Bar */}
        <div className="flex-1 mx-6 sm:mx-16 h-0.5 bg-stone-200 relative rounded-none overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-[#B88A5A] transition-all duration-300 ease-out"
            style={{ width: '15%', left: `${progress * 85}%` }}
          />
        </div>
        
        <button onClick={() => scrollBy(1)} className="p-3 rounded-none border border-stone-200 bg-white hover:bg-[#F4F0EA] hover:border-[#D2C0B4] transition-all duration-300 shadow-sm hover:shadow-md" aria-label="Next">
          <ArrowRight size={18} strokeWidth={1.5} className="text-stone-800" />
        </button>
      </div>
    </div>
  );
}
