import Image from "next/image";
import Link from "next/link";
import HomepageReviewsSection from "@/src/components/homepage/HomepageReviewsSection";
import type { Property } from "@/src/data/properties";

const STATS = [
  { value: "3", label: "Adjacent homes", detail: "Space to stay independently or together." },
  { value: "9 min", label: "Walk to Pakenham station", detail: "Transport and everyday essentials close by." },
  { value: "8+ yrs", label: "Hosting experience", detail: "Local support from enquiry to checkout." },
] as const;

const PRINCIPLES = [
  {
    number: "01",
    title: "Room to settle in",
    description: "Furnished private homes with space to cook, work, rest and live at your own pace.",
  },
  {
    number: "02",
    title: "A convenient base",
    description: "Close to the station, shopping, restaurants and Pakenham Industrial Park.",
  },
  {
    number: "03",
    title: "A real point of contact",
    description: "Responsive help for family visits, relocations, corporate bookings and longer stays.",
  },
] as const;

function HouseImage({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  if (!src) return <span className="about-story-image-fallback">Serenity on the Rocks</span>;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={priority ? "(max-width: 760px) 100vw, 58vw" : "(max-width: 760px) 100vw, 33vw"}
      unoptimized={src.startsWith("http")}
    />
  );
}

export function AboutPage({ properties }: { properties: Property[] }) {
  const heroHome = properties.find((property) => property.slug === "serenity-7") ?? properties[0];
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
      <header className="about-story-heading">
        <h1>About Serenity</h1>
        <span>Pakenham · Victoria</span>
      </header>

      <section className="about-story-hero" aria-labelledby="about-story-hero-title">
        <div className="about-story-hero__media">
          <HouseImage
            src={heroHome?.featuredImage ?? ""}
            alt={heroHome ? `${heroHome.name.replace(" - Whole", "")} exterior in Pakenham` : ""}
            priority
          />
          <span className="about-story-hero__media-label">Three homes, side by side in Pakenham.</span>
        </div>
        <div className="about-story-hero__copy">
          <p className="about-story-eyebrow">A more personal way to stay</p>
          <h2 id="about-story-hero-title">Stay comfortably.<br />Feel at home.</h2>
          <p>Serenity on the Rocks offers private furnished homes for families, work trips, relocations and longer visits. Settle in with the everyday details taken care of and one responsive local contact throughout your stay.</p>
          <div className="about-story-hero__links">
            <Link href="/houses">Explore the houses <span aria-hidden="true">↗</span></Link>
            <Link href="/contact">Get in touch <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="about-story-stats" aria-label="Serenity at a glance">
        {STATS.map((stat) => (
          <div className="about-story-stat" key={stat.label}>
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
          <h2 id="about-story-intro-title">A good place to land.</h2>
          <p>A comfortable home, a convenient location, and a host you can count on. Stay independently or reserve the houses together.</p>
        </div>
        <div className="about-story-intro__details">
          <p>Each home is furnished for the routines that make a longer visit work: cooking, working, resting and spending time together.</p>
          <p>Shops, restaurants, transport and Pakenham Industrial Park are close by, with Gippsland and Phillip Island further afield.</p>
          <p>From the first question to checkout, you have one local contact for the details of your stay.</p>
        </div>
      </section>

      <section className="about-story-principles" aria-labelledby="about-story-principles-title">
        <div className="about-story-principles__heading">
          <span>02 / What matters</span>
          <h2 id="about-story-principles-title">The stay, considered.</h2>
          <p>Practical comforts and attentive hosting make the difference, whether you are here for a few nights or much longer.</p>
        </div>
        <div className="about-story-principles__grid">
          {PRINCIPLES.map((item) => (
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

      {reviews.length > 0 ? (
        <HomepageReviewsSection
          id="guest-reviews"
          className="about-story-reviews"
          eyebrow="Guestbook"
          heading="A stay remembered in kind words."
          description="Notes from guests who stayed in the Serenity homes."
          reviews={reviews}
          maxReviews={reviews.length}
          allReviewsHref="/houses"
          allReviewsLabel="Explore the houses"
        />
      ) : null}
    </div>
  );
}
