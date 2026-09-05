import Link from "next/link";
import { GsapFadeIn } from "./AnimatedSection";
import HomepageReviewsCarousel from "./HomepageReviewsCarousel";
import ScrollWipeText from "./ScrollWipeText";

export interface HomepageReview {
  id: string;
  reviewerName: string;
  reviewText: string;
  propertyName: string;
  propertySlug: string;
  reviewDate: string | null;
  reviewDateLabel: string | null;
}

export interface HomepageReviewsSectionProps {
  eyebrow?: string;
  heading?: string;
  description?: string;
  reviews: HomepageReview[];
  maxReviews?: number;
  allReviewsHref?: string;
  allReviewsLabel?: string;
  className?: string;
  id?: string;
}

/**
 * Guest reviews section: Premium layout with elegant typography and custom carousel.
 */
export default function HomepageReviewsSection({
  eyebrow = "Guestbook",
  heading = "Space to settle in, backed by kind words.",
  description = "A few notes from guests who found a little more room to breathe in Pakenham.",
  reviews,
  maxReviews = 8,
  allReviewsHref = "/about#guest-reviews",
  allReviewsLabel = "READ ALL REVIEWS",
  className = "",
  id,
}: HomepageReviewsSectionProps) {
  if (!reviews.length) return null;

  return (
    <section id={id} className={`relative overflow-hidden bg-white px-6 py-24 sm:px-10 sm:py-32 lg:px-16 ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-[#D8CCC4]" aria-hidden="true" />

      <GsapFadeIn className="w-full flex flex-col items-center relative z-10">
        <div className="mx-auto grid w-full max-w-[92rem] gap-8 border-b border-[#D8CCC4] pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="mb-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#B88A5A]">
              <span className="h-px w-10 bg-[#B88A5A]" aria-hidden="true" />
              <span>{eyebrow}</span>
            </div>
            <ScrollWipeText className="homepage-review-heading display-font max-w-3xl text-[clamp(2.8rem,5vw,5.4rem)] leading-[0.98] tracking-[-0.04em] text-stone-900">
              {heading}
            </ScrollWipeText>
          </div>
          <p className="max-w-md text-base leading-relaxed text-stone-600 lg:justify-self-end lg:pb-1 lg:text-lg">
            {description}
          </p>
        </div>

        <HomepageReviewsCarousel reviews={reviews.slice(0, maxReviews)} />

        <div className="flex justify-center">
          <Link 
            href={allReviewsHref} 
            className="group inline-flex items-center border-b-2 border-stone-800 pb-1 text-[11px] font-bold tracking-[0.25em] uppercase text-stone-800 hover:text-[#B88A5A] hover:border-[#B88A5A] transition-all duration-300"
          >
            {allReviewsLabel}
          </Link>
        </div>
      </GsapFadeIn>
    </section>
  );
}
