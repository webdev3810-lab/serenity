import Image from "next/image";
import {
  CalendarDays,
  Check,
  ClipboardList,
  House,
  KeyRound,
  Leaf,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { PropertyImage } from "@/src/data/properties";
import { pageMetadata } from "@/src/lib/seo";
import { getGuestAutomaticImages, getGuestInformationContent } from "@/src/lib/supabase/guestInformation";
import type { GuestImageSlot } from "@/src/lib/guestInformation";

export const metadata = pageMetadata(
  "Guest Information & Stay Policies",
  "Essential guest information, house rules, self check-in guidance, and stay policies for Serenity Corporate Stays.",
);

type InformationCard = {
  id: string;
  title: string;
  eyebrow: string;
  Icon: LucideIcon;
  items: string[];
  image?: PropertyImage;
};

function PropertyPhoto({ image, alt, className, sizes, priority = false }: { image: PropertyImage; alt: string; className: string; sizes: string; priority?: boolean }) {
  const isAirbnbImage = image.src.includes("a0.muscache.com");
  const isSupabaseImage = image.src.includes(".supabase.co/");
  return (
    <div className={className}>
      <Image
        src={image.src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={isAirbnbImage || isSupabaseImage}
        referrerPolicy={isAirbnbImage ? "no-referrer" : undefined}
      />
    </div>
  );
}

export default async function Page() {
  const [automaticImages, { content, previews }] = await Promise.all([
    getGuestAutomaticImages(),
    getGuestInformationContent(),
  ]);
  const chooseImage = (slot: GuestImageSlot, fallback?: PropertyImage): PropertyImage | undefined => {
    const image = content.images[slot];
    if (image.mode === "hidden") return undefined;
    if (image.mode === "custom") {
      const src = previews[slot] || image.src;
      if (src) return { src, alt: image.alt || fallback?.alt || "Serenity furnished home" };
    }
    return fallback && { ...fallback, alt: image.alt || fallback.alt };
  };
  const heroPhoto = chooseImage("hero", automaticImages.hero);
  const entryPhoto = chooseImage("checkIn", automaticImages.checkIn);
  const bedroomPhoto = chooseImage("houseRules", automaticImages.houseRules);
  const homeCarePhoto = chooseImage("homeCare");

  const icons: Record<string, LucideIcon> = { terms: ClipboardList, privacy: ShieldCheck, cancellations: CalendarDays, "self-check-in": KeyRound, "house-rules": House, "home-care": Leaf };
  const cards: InformationCard[] = content.cards.map((card) => ({ ...card, Icon: icons[card.id] || ClipboardList, image: card.id === "self-check-in" ? entryPhoto : card.id === "house-rules" ? bedroomPhoto : card.id === "home-care" ? homeCarePhoto : undefined }));

  return (
    <div className="guest-information-page">
      <section className="guest-information-hero" aria-labelledby="guest-information-title">
        {heroPhoto && <PropertyPhoto image={heroPhoto} alt={heroPhoto.alt || "Furnished living space at a Serenity home"} className="guest-information-hero-photo" sizes="100vw" priority />}
        <div className="guest-information-hero-content">
          <p className="guest-information-kicker">{content.heroKicker}</p>
          <h1 id="guest-information-title">{content.title} <span>{content.titleAccent}</span></h1>
          <p>{content.description}</p>
        </div>
        <aside className="guest-information-hero-note" aria-label="Our stay promise">
          {content.promiseLabels.map((label, index) => <span key={index}>{label}</span>)}
          <i aria-hidden="true" />
          <p>{content.promiseText}</p>
        </aside>
      </section>

      <nav className="guest-information-jump" aria-label="On this page">
        <span>{content.jumpLabel}</span>
        <div>
          {cards.map(({ id, title }) => <a key={id} href={`#${id}`}>{title}</a>)}
        </div>
      </nav>

      <section className="guest-information-content" aria-label="Guest information and stay policies">
        <div className="guest-information-intro">
          <div>
            <p className="guest-information-kicker">{content.introKicker}</p>
            <h2>{content.introTitle}</h2>
          </div>
          <p>{content.introText}</p>
        </div>
        <div className="guest-information-grid">
          {cards.map(({ id, title, eyebrow, Icon, items, image }) => (
            <article className="guest-information-card" id={id} key={id}>
              <div className="guest-information-card-heading">
                <span className="guest-information-card-icon"><Icon size={27} strokeWidth={1.7} aria-hidden="true" /></span>
                <div><h3>{title}</h3><p>{eyebrow}</p></div>
              </div>
              <ul>{items.map((item, index) => <li key={index}><span aria-hidden="true"><Check size={12} strokeWidth={3} /></span>{item}</li>)}</ul>
              {image ? <PropertyPhoto image={image} alt={image.alt || "Serenity furnished home"} className="guest-information-card-photo" sizes="(max-width: 700px) 100vw, 33vw" /> : id === "home-care" ? (
                <div className="guest-information-card-art" aria-hidden="true"><Leaf size={56} strokeWidth={1.1} /><span>{content.homeCareCaption}</span></div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}
