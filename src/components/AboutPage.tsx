import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import HomepageReviewsSection from "@/src/components/homepage/HomepageReviewsSection";
import { SerenityLocationMap } from "@/src/components/SerenityLocationMap";
import type { Property } from "@/src/data/properties";
import { PUBLIC_PAGE_MEDIA, type PublicPageMedia } from "@/src/lib/publicPageMedia";
import type { PublicPageCopy } from "@/src/lib/publicPageCopy";

export function AboutPage({ properties, mapUrl, media, copy }: { properties: Property[]; mapUrl: string; media: PublicPageMedia; copy: PublicPageCopy }) {
  const stats = [
    { value: String(properties.length), label: copy.aboutStat1Label, detail: copy.aboutStat1Lead },
    { value: copy.aboutStat2Value, label: copy.aboutStat2Label, detail: copy.aboutStat2Lead },
    { value: copy.aboutStat3Value, label: copy.aboutStat3Label, detail: copy.aboutStat3Lead },
  ];
  const principles = [
    { number: "01", title: copy.aboutPrinciple1Title, description: copy.aboutPrinciple1Lead },
    { number: "02", title: copy.aboutPrinciple2Title, description: copy.aboutPrinciple2Lead },
    { number: "03", title: copy.aboutPrinciple3Title, description: copy.aboutPrinciple3Lead },
  ];
  const reviews = properties.flatMap((property) =>
    (property.reviews ?? []).map((review) => ({
      id: review.id,
      reviewerName: review.reviewerName,
      reviewText: review.reviewText,
      rating: review.rating,
      propertyName: property.name.replace(" - Whole", ""),
      propertySlug: property.slug,
      reviewDate: review.reviewDate,
      reviewDateLabel: review.reviewDateLabel,
    })),
  );

  return (
    <div className="about-story-page homepage-theme">
      <header className="about-story-hero" aria-labelledby="about-story-title">
        <div className="about-story-hero__copy">
          <p className="about-story-hero__location">Pakenham · Victoria</p>
          <h1 id="about-story-title">{copy.aboutHeroTitle}<span>.</span></h1>
          <h2 style={{ whiteSpace: "pre-line" }}>{copy.aboutHeroSubtitle}</h2>
          <p>{copy.aboutHeroLead}</p>
          <div className="about-story-hero__links">
            <Link href="/homes">Explore our homes <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link href="/contact">Get in touch <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="about-story-hero__media">
          <Image
            src={media.aboutHero.src}
            alt={media.aboutHero.alt}
            fill
            priority
            sizes="(max-width: 760px) 100vw, 52vw"
          />
          {media.aboutHero.src === PUBLIC_PAGE_MEDIA.aboutHero.src && <span className="about-story-hero__media-label illustrative-photo-label">Illustrative interior</span>}
        </div>
      </header>

      <section className="about-story-stats" aria-label="Serenity at a glance">
        {stats.map((stat, index) => (
          <div className="about-story-stat" key={index}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
            <p>{stat.detail}</p>
          </div>
        ))}
      </section>

      <section className="about-story-intro" aria-labelledby="about-story-intro-title">
        <div className="about-story-section-topline">
          <span>The simple idea</span>
          <span>01 / Our approach</span>
        </div>
        <div className="about-story-intro__statement">
          <h2 id="about-story-intro-title">{copy.aboutApproachTitle}</h2>
          <p>{copy.aboutApproachLead}</p>
        </div>
        <div className="about-story-intro__details">
          <p>{copy.aboutApproachDetail1}</p>
          <p>{copy.aboutApproachDetail2}</p>
          <p>{copy.aboutApproachDetail3}</p>
        </div>
        <div className="about-story-intro__map" aria-label="Map of the Serenity homes and nearby places in Pakenham">
          <SerenityLocationMap />
        </div>
        <div className="about-story-intro__map-footer">
          <span>Pakenham · Victoria 3810</span>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer">Open map <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </section>

      <section className="about-story-principles" aria-labelledby="about-story-principles-title">
        <div className="about-story-principles__heading">
          <span>02 / What matters</span>
          <h2 id="about-story-principles-title">{copy.aboutPrinciplesTitle}</h2>
          <p>{copy.aboutPrinciplesLead}</p>
        </div>
        <div className="about-story-principles__grid">
          {principles.map((item) => (
            <article className="about-story-principle" key={item.number}>
              <span>{item.number}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-story-host" aria-labelledby="about-story-host-title">
        <div className="about-story-section-topline">
          <span>The person behind your stay</span>
          <span>03 / Your host</span>
        </div>
        <div className="about-story-host__content">
          <div className="about-story-host__intro">
            <p className="about-story-eyebrow">A local point of contact</p>
            <h2 id="about-story-host-title">{copy.aboutHostTitle}</h2>
            <p>{copy.aboutHostLead}</p>
          </div>
          <div className="about-story-host__profile">
            <div className="about-story-host__name">
              <strong>{copy.aboutHostName}</strong>
              <span>Host</span>
            </div>
            <dl className="about-story-host__metrics" aria-label="Francis’s hosting profile">
              <div><dt>Reviews</dt><dd>{copy.aboutHostReviews}</dd></div>
              <div><dt>Rating</dt><dd>{copy.aboutHostRating}<span aria-label="stars">★</span></dd></div>
              <div><dt>Years hosting</dt><dd>{copy.aboutHostYears}</dd></div>
            </dl>
            <div className="about-story-host__details">
              <p>{copy.aboutHostLocation}</p>
              <p>{copy.aboutHostVerification}</p>
            </div>
          </div>
        </div>
      </section>

      {reviews.length > 0 ? (
        <HomepageReviewsSection
          id="guest-reviews"
          className="about-story-reviews"
          eyebrow="Guestbook"
          heading={copy.aboutReviewsTitle}
          description={copy.aboutReviewsLead}
          reviews={reviews}
          maxReviews={reviews.length}
          allReviewsHref="/homes"
          allReviewsLabel="Explore our homes"
        />
      ) : null}
    </div>
  );
}
