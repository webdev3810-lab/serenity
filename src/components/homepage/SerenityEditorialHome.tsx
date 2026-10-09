import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck2, CalendarDays, ContactRound, House } from "lucide-react";
import SerenityHouseTitleRail from "./SerenityHouseTitleRail";
import SerenityHeroImage from "./SerenityHeroImage";
import SerenityPhotoPreviewRail from "./SerenityPhotoPreviewRail";
import ScrollWipeText from "./ScrollWipeText";

export type SerenityEditorialHouse = {
  name: string;
  slug: string;
  image: string;
  imageAlt: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
};

export type SerenityEditorialGalleryImage = {
  src: string;
  alt: string;
  label: string;
};

export type SerenityEditorialFaq = {
  question: string;
  answer: string;
};

export type SerenityEditorialPreviewImage = {
  src: string;
  alt: string;
  houseName: string;
  slug: string;
  photoNumber: number;
};

type SerenityEditorialHomeProps = {
  heroImage: string;
  heroAlt: string;
  houses: SerenityEditorialHouse[];
  gallery: SerenityEditorialGalleryImage[];
  photoPreviews: SerenityEditorialPreviewImage[];
  faqHeading: string;
  faqDescription: string;
  faqs: SerenityEditorialFaq[];
};

function EditorialImage({
  src,
  alt,
  priority = false,
  sizes = "100vw",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (!src) return <div className="serenity-editorial-image-fallback" aria-hidden="true" />;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      unoptimized={src.includes("a0.muscache.com") || src.includes(".supabase.co/")}
    />
  );
}

export default function SerenityEditorialHome({
  heroImage,
  heroAlt,
  houses,
  gallery,
  photoPreviews,
  faqHeading,
  faqDescription,
  faqs,
}: SerenityEditorialHomeProps) {
  const locationImage = gallery[3] ?? gallery[0];
  const marqueeDuration = `${Math.max(photoPreviews.length * 6, 72)}s`;

  return (
    <div className="serenity-editorial-home">
      <section className="serenity-editorial-hero" aria-labelledby="serenity-editorial-title">
        <SerenityHeroImage key={heroImage} src={heroImage} alt={heroAlt} />
        <div className="serenity-editorial-hero__content">
          <p className="serenity-editorial-hero__eyebrow">Serenity on the Rocks · Pakenham</p>
          <h1 id="serenity-editorial-title">
            <span>Whole-Home Stays.</span>
            <span>Simple Direct</span>
            <span>Booking.</span>
          </h1>
          <p className="serenity-editorial-hero__description">
            Fully furnished private homes for relocations, home renovations, business travel and partner-booked stays.
          </p>
          <div className="serenity-editorial-hero__actions">
            <Link href="/houses">Check Availability</Link>
            <Link href="/corporate-stays#corporate-booking">Partner Booking</Link>
          </div>
        </div>
        <div className="serenity-editorial-hero__stats" aria-label="Stay benefits">
          <div className="serenity-editorial-hero__stat">
            <span className="serenity-editorial-hero__stat-icon" aria-hidden="true"><House size={22} strokeWidth={1.8} /></span>
            <strong>Move-in ready</strong>
            <span className="serenity-editorial-hero__stat-label">Furnished homes with the everyday essentials in place.</span>
          </div>
          <div className="serenity-editorial-hero__stat">
            <span className="serenity-editorial-hero__stat-icon" aria-hidden="true"><CalendarDays size={22} strokeWidth={1.8} /></span>
            <strong>Flexible stays</strong>
            <span className="serenity-editorial-hero__stat-label">Stay a few weeks or settle in for longer.</span>
          </div>
          <div className="serenity-editorial-hero__stat">
            <span className="serenity-editorial-hero__stat-icon" aria-hidden="true"><CalendarCheck2 size={22} strokeWidth={1.8} /></span>
            <strong>Book direct</strong>
            <span className="serenity-editorial-hero__stat-label">Check available dates and arrange your stay with us.</span>
          </div>
          <div className="serenity-editorial-hero__stat">
            <span className="serenity-editorial-hero__stat-icon" aria-hidden="true"><ContactRound size={22} strokeWidth={1.8} /></span>
            <strong>Personal support</strong>
            <span className="serenity-editorial-hero__stat-label">One responsive team, from enquiry to checkout.</span>
          </div>
        </div>
      </section>

      <section className="serenity-editorial-houses" aria-label="The Serenity houses">
        <SerenityHouseTitleRail houses={houses.map(({ name, slug, maxGuests, bedrooms, beds, bathrooms }) => ({ name, slug, maxGuests, bedrooms, beds, bathrooms }))} />
        {houses.map((house, index) => (
          <article className="serenity-editorial-house" key={house.slug} style={{ zIndex: index + 1 }}>
            <EditorialImage src={house.image} alt={house.imageAlt} />
            <div className="serenity-editorial-house__shade" aria-hidden="true" />
            <h2 className="serenity-editorial-visually-hidden">{house.name}</h2>
          </article>
        ))}
      </section>

      <section className="serenity-editorial-intro" aria-labelledby="serenity-editorial-intro-title">
        <div className="serenity-editorial-intro__topline">
          <ScrollWipeText as="h2" id="serenity-editorial-intro-title">The tailored stay</ScrollWipeText>
          <Link href="/houses">View all houses <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="serenity-editorial-intro__statement">
          <ScrollWipeText as="p">Three private homes, considered down to the everyday details.</ScrollWipeText>
          <ScrollWipeText as="p">Stay independently or reserve the houses together for family, work, relocation and longer visits.</ScrollWipeText>
        </div>
      </section>

      {photoPreviews.length > 0 ? (
        <section className="serenity-editorial-photo-preview" aria-label="Serenity house photo previews">
          <SerenityPhotoPreviewRail photos={photoPreviews} duration={marqueeDuration} />
        </section>
      ) : null}

      <section className="serenity-editorial-services" aria-labelledby="serenity-editorial-services-title">
        <div className="serenity-editorial-services__heading">
          <ScrollWipeText as="h2" id="serenity-editorial-services-title" tone="light">Stay services</ScrollWipeText>
          <ScrollWipeText as="p" tone="light">The finishing touches for an easy arrival and a settled stay.</ScrollWipeText>
        </div>
        <div className="serenity-editorial-services__grid">
          <Link href="/houses">
            <span>01</span>
            <ScrollWipeText as="h3" tone="light">Private whole homes</ScrollWipeText>
            <p>Space to cook, work, rest and live at your own pace.</p>
          </Link>
          <Link href="/corporate-stays">
            <span>02</span>
            <ScrollWipeText as="h3" tone="light">Corporate stays</ScrollWipeText>
            <p>Flexible arrangements for project teams and relocations.</p>
          </Link>
          <Link href="/contact">
            <span>03</span>
            <ScrollWipeText as="h3" tone="light">Local support</ScrollWipeText>
            <p>One responsive point of contact from enquiry to checkout.</p>
          </Link>
        </div>
      </section>

      <section className="serenity-editorial-location" aria-labelledby="serenity-editorial-location-title">
        <EditorialImage
          src={locationImage?.src || heroImage}
          alt={locationImage?.alt || "Serenity on the Rocks in Pakenham"}
        />
        <div className="serenity-editorial-location__shade" aria-hidden="true" />
        <div className="serenity-editorial-location__copy">
          <ScrollWipeText as="p" tone="light">Our house is yours</ScrollWipeText>
          <ScrollWipeText as="h2" id="serenity-editorial-location-title" tone="light">Pakenham,<br />Victoria</ScrollWipeText>
          <div>
            <Link href="/houses">Explore the homes</Link>
            <Link href="/contact">Plan your stay</Link>
          </div>
        </div>
      </section>

      <section className="serenity-editorial-faq" id="faqs" aria-labelledby="serenity-editorial-faq-title">
        <div className="serenity-editorial-faq__header">
          <p>FAQs · Before you arrive</p>
          <div>
            <ScrollWipeText as="h2" id="serenity-editorial-faq-title" tone="light">{faqHeading}</ScrollWipeText>
            <ScrollWipeText as="p" tone="light">{faqDescription}</ScrollWipeText>
          </div>
        </div>
        <div className="serenity-editorial-faq__list" aria-label="Frequently asked questions">
          {faqs.map((faq, index) => (
            <details className="serenity-editorial-faq__item" key={`${faq.question}-${index}`}>
              <summary>
                <span className="serenity-editorial-faq__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="serenity-editorial-faq__question">{faq.question}</span>
                <span className="serenity-editorial-faq__toggle" aria-hidden="true">+</span>
              </summary>
              <div className="serenity-editorial-faq__answer">{faq.answer}</div>
            </details>
          ))}
        </div>
        <div className="serenity-editorial-faq__contact">
          <p>Have another question?</p>
          <Link href="/contact">Talk to our team <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="serenity-editorial-social" aria-label="Serenity social links">
        <p>Your next stay starts here</p>
        <div>
          <Link href="/houses">Explore our homes</Link>
          <Link href="/about">Our story</Link>
          <Link href="/contact">Get in touch</Link>
        </div>
      </section>

    </div>
  );
}
