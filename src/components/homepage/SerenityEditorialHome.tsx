import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SerenityHouseTitleRail from "./SerenityHouseTitleRail";
import SerenityHeroImage from "./SerenityHeroImage";
import SerenityPhotoPreviewRail from "./SerenityPhotoPreviewRail";
import ScrollWipeText from "./ScrollWipeText";
import StayHighlightIcon from "./StayHighlightIcon";
import type { EditorialHomepageContent } from "@/src/lib/homepageEditorialContent";

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
  photoPreviews: SerenityEditorialPreviewImage[];
  content: EditorialHomepageContent;
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
  photoPreviews,
  content,
}: SerenityEditorialHomeProps) {
  const marqueeDuration = `${Math.max(photoPreviews.length * 6, 72)}s`;

  return (
    <div className="serenity-editorial-home">
      <section className="serenity-editorial-hero" aria-labelledby="serenity-editorial-title">
        <SerenityHeroImage key={heroImage} src={heroImage} alt={heroAlt} />
        <div className="serenity-editorial-hero__content">
          <p className="serenity-editorial-hero__eyebrow">{content.editorial_hero_eyebrow}</p>
          <h1 id="serenity-editorial-title">
            {content.editorial_hero_heading.split("\n").map((line, index) => <span key={index}>{line}</span>)}
          </h1>
          <p className="serenity-editorial-hero__description">
            {content.editorial_hero_description}
          </p>
          <div className="serenity-editorial-hero__actions">
            <Link href="/houses">{content.editorial_hero_primary_label}</Link>
            <Link href="/corporate-stays#corporate-booking">{content.editorial_hero_secondary_label}</Link>
          </div>
        </div>
        <div className="serenity-editorial-hero__stats" aria-label="Stay benefits">
          {content.editorial_highlights.map((highlight, index) => {
            return <div className="serenity-editorial-hero__stat" key={index}>
              <span className="serenity-editorial-hero__stat-icon" aria-hidden="true"><StayHighlightIcon icon={highlight.icon} /></span>
              <strong>{highlight.title}</strong>
              <span className="serenity-editorial-hero__stat-label">{highlight.description}</span>
            </div>;
          })}
        </div>
      </section>

      <section className="serenity-editorial-houses" aria-label="The Serenity houses">
        <SerenityHouseTitleRail houses={houses.map(({ name, slug, maxGuests, bedrooms, beds, bathrooms }) => ({ name, slug, maxGuests, bedrooms, beds, bathrooms }))} />
        {houses.map((house, index) => (
          <article className="serenity-editorial-house" key={house.slug} style={{ zIndex: index + 1 }}>
            <div className="serenity-editorial-house__media">
              <EditorialImage src={house.image} alt={house.imageAlt} />
              <div className="serenity-editorial-house__shade" aria-hidden="true" />
            </div>
            <h2 className="serenity-editorial-visually-hidden serenity-editorial-house__desktop-heading">{house.name}</h2>
            <div className="serenity-editorial-house__mobile-content">
              <h2>{house.name}</h2>
              <ul aria-label={`${house.name} details`}>
                <li>Sleeps up to {house.maxGuests}</li>
                <li>{house.bedrooms} bedrooms</li>
                <li>{house.beds} beds</li>
                <li>{house.bathrooms} bathrooms</li>
              </ul>
              <Link href={`/properties/${house.slug}`}>Explore {house.name} <ArrowUpRight size={18} aria-hidden="true" /></Link>
            </div>
          </article>
        ))}
      </section>

      <section className="serenity-editorial-intro" aria-labelledby="serenity-editorial-intro-title">
        <div className="serenity-editorial-intro__topline">
          <ScrollWipeText as="h2" id="serenity-editorial-intro-title">{content.editorial_intro_heading}</ScrollWipeText>
          <Link href="/houses">{content.editorial_intro_link_label} <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="serenity-editorial-intro__statement">
          <ScrollWipeText as="p">{content.editorial_intro_statement_one}</ScrollWipeText>
          <ScrollWipeText as="p">{content.editorial_intro_statement_two}</ScrollWipeText>
        </div>
      </section>

      {photoPreviews.length > 0 ? (
        <section className="serenity-editorial-photo-preview" aria-label="Serenity house photo previews">
          <SerenityPhotoPreviewRail photos={photoPreviews} duration={marqueeDuration} />
        </section>
      ) : null}

      <section className="serenity-editorial-services" aria-labelledby="serenity-editorial-services-title">
        <div className="serenity-editorial-services__heading">
          <ScrollWipeText as="h2" id="serenity-editorial-services-title" tone="light">{content.editorial_services_heading}</ScrollWipeText>
          <ScrollWipeText as="p" tone="light">{content.editorial_services_description}</ScrollWipeText>
        </div>
        <div className="serenity-editorial-services__grid">
          {content.editorial_services.map((service, index) => <Link href={["/houses", "/corporate-stays", "/contact"][index]} key={index}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <ScrollWipeText as="h3" tone="light">{service.title}</ScrollWipeText>
            <p>{service.description}</p>
          </Link>)}
        </div>
      </section>

      <section className="serenity-editorial-faq" id="faqs" aria-labelledby="serenity-editorial-faq-title">
        <div className="serenity-editorial-faq__header">
          <p>{content.editorial_faq_eyebrow}</p>
          <div>
            <ScrollWipeText as="h2" id="serenity-editorial-faq-title" tone="light">{content.faq_heading}</ScrollWipeText>
            <ScrollWipeText as="p" tone="light">{content.faq_description}</ScrollWipeText>
          </div>
        </div>
        <div className="serenity-editorial-faq__list" aria-label="Frequently asked questions">
          {content.faqs.map((faq, index) => (
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
          <p>{content.editorial_faq_contact_prompt}</p>
          <Link href="/contact">{content.editorial_faq_contact_label} <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="serenity-editorial-social" aria-label="Serenity social links">
        <p>{content.editorial_social_heading}</p>
        <div>
          <Link href="/houses">{content.editorial_social_houses_label}</Link>
          <Link href="/about">{content.editorial_social_story_label}</Link>
          <Link href="/contact">{content.editorial_social_contact_label}</Link>
        </div>
      </section>

    </div>
  );
}
