import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

import { GsapFadeIn, GsapStagger } from "@/src/components/GsapAnimations";
import ScrollWipeText from "@/src/components/homepage/ScrollWipeText";
import HomepageReviewsSection from "@/src/components/homepage/HomepageReviewsSection";
import type { Property } from "@/src/data/properties";

const ABOUT_CONTENT = {
  hero: {
    index: "01",
    label: "About Serenity",
    title: "Your Home Away From Home in the Heart of Pakenham",
    introduction: "Stay comfortably. Stay conveniently. Feel at home.",
    detail:
      "With 8 years of hosting experience, Superhost recognition, and consistently positive guest reviews, we’re committed to making every stay comfortable, reliable, and stress-free.",
  },
  stats: [
    {
      value: "8",
      label: "Years hosting",
      detail: "Superhost recognition and positive guest reviews.",
    },
    {
      value: "5 min",
      label: "Walk to Pakenham Station",
      detail: "Steps away from the bus station.",
    },
    {
      value: "3",
      label: "Private houses",
      detail: "Leisure, corporate, insurance, and travel-agent bookings welcome.",
    },
  ],
  idea: {
    index: "02",
    title: "A comfortable home, a convenient location, and a host you can count on.",
    introduction:
      "Stay comfortably. Stay conveniently. Feel at home.",
    paragraphs: [
      "Enjoy modern comfort in a beautifully furnished, peaceful home, conveniently located just a 5-minute walk from Pakenham Train Station and steps away from the bus station.",
      "Set in a welcoming, family-friendly area, you’ll be close to shopping centres, restaurants, and Pakenham Industrial Park — perfect for both business and leisure.",
      "When it’s time to explore, you’ll have the perfect base to discover Gumbuya World, the beautiful Gippsland region, and Phillip Island.",
    ],
  },
  principles: {
    index: "03",
    title: "Easy to Book. Easy to Communicate With. Easy to Stay.",
    introduction:
      "From easy reservations to invoices and regular updates, we’re responsive, flexible, and easy to work with.",
    items: [
      {
        number: "01",
        title: "Modern comfort",
        text: "A beautifully furnished, peaceful home gives you room to cook, work, rest, and feel at home.",
      },
      {
        number: "02",
        title: "A convenient base",
        text: "Stay close to transport, shopping centres, restaurants, Pakenham Industrial Park, and the places worth exploring across Gippsland.",
      },
      {
        number: "03",
        title: "Bookings made easy",
        text: "We have extensive experience with corporate bookings, insurance stays, and travel-agent bookings, keeping the process smooth and hassle-free.",
      },
    ],
  },
};

export function AboutPage({ properties }: { properties: Property[] }) {
  const reviews = properties.flatMap((property) =>
    (property.reviews ?? []).map((review) => ({
      id: review.id,
      reviewerName: review.reviewerName,
      reviewText: review.reviewText,
      propertyName: property.name.replace(" - Whole", ""),
      propertySlug: property.slug,
      reviewDate: review.reviewDate,
      reviewDateLabel: review.reviewDateLabel,
    })),
  );

  return (
    <main className="about-editorial-page">
      <section className="about-editorial-hero" aria-label="About Serenity">
        <div className="about-editorial-shell">
          <div className="about-editorial-topline">
            <span className="about-editorial-index" aria-hidden="true">
              {ABOUT_CONTENT.hero.index}
            </span>
            <span>{ABOUT_CONTENT.hero.label}</span>
            <span className="about-editorial-location">Pakenham · Victoria</span>
          </div>

          <GsapFadeIn className="about-editorial-hero-grid">
            <div>
              <ScrollWipeText
                as="h1"
                className="about-editorial-hero-title"
              >
                {ABOUT_CONTENT.hero.title}
              </ScrollWipeText>
            </div>

            <div className="about-editorial-hero-copy">
              <p className="about-editorial-lead">{ABOUT_CONTENT.hero.introduction}</p>
              <p className="about-editorial-support">{ABOUT_CONTENT.hero.detail}</p>
              <div className="about-editorial-actions">
                <Link className="about-editorial-button about-editorial-button-primary" href="/houses">
                  Explore the houses <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <Link className="about-editorial-button about-editorial-button-secondary" href="/contact">
                  Find us &amp; get in touch <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </GsapFadeIn>

          <div className="about-editorial-stats" aria-label="Serenity at a glance">
            {ABOUT_CONTENT.stats.map((stat) => (
              <div className="about-editorial-stat" key={stat.label}>
                <p className="about-editorial-stat-value">{stat.value}</p>
                <p className="about-editorial-stat-label">{stat.label}</p>
                <p className="about-editorial-stat-detail">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-editorial-section" aria-label="The simple idea">
        <div className="about-editorial-shell">
          <GsapFadeIn className="about-editorial-section-heading">
            <p className="about-editorial-section-index" aria-hidden="true">
              {ABOUT_CONTENT.idea.index}
            </p>
            <div>
              <ScrollWipeText
                as="h2"
                className="about-editorial-section-title"
              >
                {ABOUT_CONTENT.idea.title}
              </ScrollWipeText>
            </div>
            <p className="about-editorial-section-introduction">{ABOUT_CONTENT.idea.introduction}</p>
          </GsapFadeIn>

          <GsapFadeIn className="about-editorial-prose-grid">
            {ABOUT_CONTENT.idea.paragraphs.map((paragraph, index) => (
              <div className="about-editorial-prose-item" key={paragraph}>
                <span className="about-editorial-prose-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p>{paragraph}</p>
              </div>
            ))}
          </GsapFadeIn>
        </div>
      </section>

      <section
        className="about-editorial-section about-editorial-principles"
        aria-label="Made for real stays"
      >
        <div className="about-editorial-shell">
          <GsapFadeIn className="about-editorial-section-heading">
            <p className="about-editorial-section-index" aria-hidden="true">
              {ABOUT_CONTENT.principles.index}
            </p>
            <div>
              <ScrollWipeText
                as="h2"
                className="about-editorial-section-title"
              >
                {ABOUT_CONTENT.principles.title}
              </ScrollWipeText>
            </div>
            <p className="about-editorial-section-introduction">
              {ABOUT_CONTENT.principles.introduction}
            </p>
          </GsapFadeIn>

          <GsapStagger className="about-editorial-principle-list" selector=".about-editorial-principle">
            {ABOUT_CONTENT.principles.items.map(({ number, title, text }) => (
              <article className="about-editorial-principle" key={title}>
                <span className="about-editorial-principle-number" aria-hidden="true">
                  {number}
                </span>
                <div className="about-editorial-principle-title">
                  <h3>{title}</h3>
                </div>
                <p>{text}</p>
                <CheckCircle2
                  className="about-editorial-principle-mark"
                  size={19}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </article>
            ))}
          </GsapStagger>
        </div>
      </section>

      {reviews.length > 0 && (
        <HomepageReviewsSection
          id="guest-reviews"
          eyebrow="Guestbook"
          heading="A stay remembered in kind words."
          description="Read the full collection of five-star notes from guests who stayed in the Serenity houses."
          reviews={reviews}
          maxReviews={reviews.length}
          allReviewsHref="/houses"
          allReviewsLabel="EXPLORE THE HOUSES"
        />
      )}

    </main>
  );
}
