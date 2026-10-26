import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CarFront, FileText, PawPrint, Plug, WashingMachine, Wifi } from "lucide-react";
import SerenityHeroImage from "./SerenityHeroImage";
import SerenityPhotoPreviewRail from "./SerenityPhotoPreviewRail";
import ScrollWipeText from "./ScrollWipeText";
import StayHighlightIcon from "./StayHighlightIcon";
import type { EditorialHomepageContent } from "@/src/lib/homepageEditorialContent";
import { editorialHouseDetails } from "@/src/lib/editorialHouseDetails";

export type SerenityEditorialHouse = {
  name: string;
  slug: string;
  image: string;
  imageAlt: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  parkingType: string;
  amenities: string[];
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

const stayEssentials = [
  { label: "High-speed Wi-Fi", detail: null, Icon: Wifi },
  { label: "Utilities included", detail: null, Icon: Plug },
  { label: "Laundry facilities", detail: null, Icon: WashingMachine },
  { label: "Free parking", detail: null, Icon: CarFront },
  { label: "Pet friendly", detail: "Declare before arrival", Icon: PawPrint },
  { label: "Corporate invoicing", detail: "Tax invoice & PO on request", Icon: FileText },
] as const;

export default function SerenityEditorialHome({
  heroImage,
  heroAlt,
  houses,
  photoPreviews,
  content,
}: SerenityEditorialHomeProps) {
  const marqueeDuration = `${Math.max(photoPreviews.length * 6, 72)}s`;
  const audienceItems = content.editorial_hero_audience.split("\n").map((item) => item.trim()).filter(Boolean);
  const audienceText = audienceItems.length > 1
    ? `${audienceItems.slice(0, -1).join(", ")} & ${audienceItems[audienceItems.length - 1]}`
    : audienceItems[0] ?? "";

  return (
    <div className="serenity-editorial-home">
      <section className="serenity-editorial-hero" aria-labelledby="serenity-editorial-title">
        <SerenityHeroImage key={heroImage} src={heroImage} alt={heroAlt} />
        <div className="serenity-editorial-hero__content">
          <h1 id="serenity-editorial-title">
            {content.editorial_hero_heading.split("\n").map((line, index) => <span key={index}>{line}</span>)}
          </h1>
          {audienceText && <p className="serenity-editorial-hero__audience">For {audienceText}</p>}
          <p className="serenity-editorial-hero__description">
            {content.editorial_hero_description}
          </p>
          <div className="serenity-editorial-hero__actions">
            <Link href="/corporate-stays#corporate-question">{content.editorial_hero_primary_label}<ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/homes">{content.editorial_hero_secondary_label}<ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <div className="serenity-editorial-hero__stats" aria-label="Stay benefits">
            {content.editorial_highlights.map((highlight, index) => <div className="serenity-editorial-hero__stat" key={index}>
              <span className="serenity-editorial-hero__stat-icon" aria-hidden="true"><StayHighlightIcon icon={highlight.icon} /></span>
              <strong>{highlight.title}</strong>
              <span className="serenity-editorial-hero__stat-label">{highlight.description}</span>
            </div>)}
          </div>
        </div>
      </section>

      <section className="houses-editorial-list serenity-editorial-house-cards" aria-label="The Serenity houses">
        {houses.map((house) => (
          <article className="houses-editorial-list__card" key={house.slug}>
            <Link href={`/properties/${house.slug}`} className="houses-editorial-list__link">
              <span className="houses-editorial-list__media">
                {house.image ? (
                  <Image
                    src={house.image}
                    alt={house.imageAlt}
                    fill
                    sizes="(max-width: 760px) 100vw, (max-width: 1023px) 50vw, 33vw"
                    unoptimized={house.image.includes(".supabase.co/")}
                  />
                ) : <span className="houses-editorial-list__fallback">House photos coming soon</span>}
              </span>
              <div className="houses-editorial-list__content">
                <div className="houses-editorial-list__caption">
                  <h2 className="houses-editorial-list__title">{house.name}</h2>
                </div>
                <ul className="houses-editorial-list__details" aria-label={`${house.name} at a glance`}>
                  {editorialHouseDetails(house).map(({ label, Icon }) => (
                    <li key={label}><Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></li>
                  ))}
                </ul>
                <span className="houses-editorial-list__cta">Explore house <ArrowUpRight size={17} aria-hidden="true" /></span>
              </div>
            </Link>
          </article>
        ))}
      </section>

      <section className="serenity-editorial-essentials" aria-label="Stay essentials">
        <ul className="serenity-editorial-essentials__grid">
          {stayEssentials.map(({ label, detail, Icon }) => (
            <li className="serenity-editorial-essentials__card" key={label}>
              <Icon size={27} strokeWidth={1.8} aria-hidden="true" />
              <span><strong>{label}</strong>{detail && <small>{detail}</small>}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="serenity-editorial-intro" aria-labelledby="serenity-editorial-intro-title">
        <div className="serenity-editorial-intro__topline">
          <ScrollWipeText as="h2" id="serenity-editorial-intro-title">{content.editorial_intro_heading}</ScrollWipeText>
          <Link href="/homes">{content.editorial_intro_link_label} <ArrowUpRight size={17} aria-hidden="true" /></Link>
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
          {content.editorial_services.map((service, index) => <Link href={["/homes", "/corporate-stays", "/contact"][index]} key={index}>
            <div className="serenity-editorial-services__meta" aria-hidden="true">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <ArrowUpRight size={18} strokeWidth={1.5} />
            </div>
            <ScrollWipeText as="h3" tone="light">{service.title}</ScrollWipeText>
            <p>{service.description}</p>
          </Link>)}
        </div>
      </section>

      <section className="serenity-editorial-social" aria-labelledby="serenity-editorial-social-title">
        <h2 id="serenity-editorial-social-title">{content.editorial_social_heading}</h2>
        <div>
          <Link href="/homes"><span className="serenity-editorial-social__number" aria-hidden="true">01</span><span>{content.editorial_social_houses_label}</span><ArrowUpRight size={20} strokeWidth={1.5} aria-hidden="true" /></Link>
          <Link href="/about"><span className="serenity-editorial-social__number" aria-hidden="true">02</span><span>{content.editorial_social_story_label}</span><ArrowUpRight size={20} strokeWidth={1.5} aria-hidden="true" /></Link>
          <Link href="/contact"><span className="serenity-editorial-social__number" aria-hidden="true">03</span><span>{content.editorial_social_contact_label}</span><ArrowUpRight size={20} strokeWidth={1.5} aria-hidden="true" /></Link>
        </div>
      </section>

    </div>
  );
}
