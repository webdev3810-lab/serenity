import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ClipboardList,
  Heart,
  House,
  KeyRound,
  Leaf,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PropertyImage } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import { getHomepageHeroMedia, getPublicPropertyBySlug } from "@/src/lib/supabase/content";
import { pageMetadata } from "@/src/lib/seo";

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
  const [property, homepageHeroMedia] = await Promise.all([
    getPublicPropertyBySlug("serenity-7"),
    getHomepageHeroMedia(),
  ]);
  const photos = property?.images.filter((image) => image.src && image.isVisible !== false) ?? [];
  const findPhoto = (pattern: RegExp) => photos.find((image) => pattern.test(`${image.alt} ${image.category ?? ""} ${image.categoryLabel ?? ""}`));
  const heroPhoto = findPhoto(/living|lounge|family/i) ?? photos[1] ?? photos[0];
  const homepageHero = homepageHeroMedia.find((media) => media.media_type === "image" && isApprovedHomepageMediaSource(media.public_url));
  const entryPhoto = homepageHero
    ? { src: homepageHero.public_url, alt: homepageHero.alt_text || "Serenity furnished homes in Pakenham" }
    : findPhoto(/exterior|entry|front/i) ?? photos[0];
  const bedroomPhoto = findPhoto(/bedroom/i) ?? photos[2];

  const cards: InformationCard[] = [
    {
      id: "terms",
      title: "Terms & Conditions",
      eyebrow: "Important information for your stay",
      Icon: ClipboardList,
      items: [
        "All reservations are subject to confirmation and acceptance.",
        "The lead guest must ensure all booking details are accurate.",
        "Only registered guests may stay at the property unless approved in advance.",
        "Guests are expected to comply with house rules and local regulations.",
        "Serenity Corporate Stays may refuse or cancel bookings that do not comply with property policies.",
        "Check-in and check-out times must be observed unless arranged in advance.",
      ],
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      eyebrow: "Your privacy matters",
      Icon: ShieldCheck,
      items: [
        "Guest information is collected only for reservation management, guest communication, payment processing, and legal obligations.",
        "Personal information is handled with care and kept confidential.",
        "Information is not sold to third parties.",
        "Details may be shared with trusted service providers only when needed to complete a booking or meet legal requirements.",
        "Guests may ask how their information is used.",
      ],
    },
    {
      id: "cancellations",
      title: "Cancellation Policy",
      eyebrow: "Flexible, fair and transparent",
      Icon: CalendarDays,
      items: [
        "Submit cancellation and amendment requests as early as possible.",
        "Refunds, if applicable, depend on the booking terms, notice period, and booking channel.",
        "Late cancellations, no-shows, or shortened stays may incur charges.",
        "Approved corporate or partner bookings may have separately agreed terms.",
        "Any applicable refund is returned to the original payment method.",
      ],
    },
    {
      id: "self-check-in",
      title: "Self Check-In",
      eyebrow: "A convenient and secure arrival",
      Icon: KeyRound,
      image: entryPhoto,
      items: [
        "Where offered, self check-in is available using a secure key safe or lockbox.",
        "Access instructions are shared with confirmed guests before arrival.",
        "Keep access details confidential and do not share them outside your travelling party.",
        "Return keys as instructed at check-out.",
        "Our team is available if you need help with your arrival.",
      ],
    },
    {
      id: "house-rules",
      title: "House Rules",
      eyebrow: "A welcoming home for every guest",
      Icon: House,
      image: bedroomPhoto,
      items: [
        "No parties, events, or excessive noise.",
        "Please respect neighbours and the property's quiet hours.",
        "No smoking inside the property.",
        "Loss, damage, or breakage beyond normal wear and tear may be charged to the guest.",
        "Report accidental damage promptly so we can assist.",
        "Only registered guests may stay unless prior approval is given.",
        "Leave the home in a tidy and respectful condition.",
      ],
    },
    {
      id: "home-care",
      title: "Care for the Home & Environment",
      eyebrow: "Small actions make a big difference",
      Icon: Leaf,
      items: [
        "Help us conserve water and electricity during your stay.",
        "Switch off lights, air-conditioning, heating, televisions, and appliances when not in use.",
        "Avoid unnecessary water use wherever possible.",
        "Keep doors and windows closed when heating or cooling is operating.",
        "Use bins appropriately and recycle where available.",
        "Mindful everyday actions help maintain a comfortable, sustainable stay for everyone.",
      ],
    },
  ];

  return (
    <div className="guest-information-page">
      <section className="guest-information-hero" aria-labelledby="guest-information-title">
        {heroPhoto && <PropertyPhoto image={heroPhoto} alt="Furnished living space at a Serenity home" className="guest-information-hero-photo" sizes="(max-width: 700px) 100vw, 100vw" priority />}
        <div className="guest-information-hero-content">
          <p className="guest-information-kicker">The Serenity stay guide</p>
          <h1 id="guest-information-title">Guest Information <span>&amp; Stay Policies</span></h1>
          <p>Everything you need for a smooth, comfortable, and well-managed stay.</p>
        </div>
        <aside className="guest-information-hero-note" aria-label="Our stay promise">
          <span>Comfort</span><span>Convenience</span><span>Professional stays</span>
          <i aria-hidden="true" />
          <p>A home away from home for business and beyond.</p>
        </aside>
      </section>

      <nav className="guest-information-jump" aria-label="On this page">
        <span>Explore the guide</span>
        <div>
          {cards.map(({ id, title }) => <a key={id} href={`#${id}`}>{title}</a>)}
        </div>
      </nav>

      <section className="guest-information-content" aria-label="Guest information and stay policies">
        <div className="guest-information-intro">
          <div>
            <p className="guest-information-kicker">At a glance</p>
            <h2>Feel at home, from arrival to departure.</h2>
          </div>
          <p>This guide covers the essentials. Your booking confirmation and the details for your specific home provide the terms that apply to your stay.</p>
        </div>
        <div className="guest-information-grid">
          {cards.map(({ id, title, eyebrow, Icon, items, image }) => (
            <article className="guest-information-card" id={id} key={id}>
              <div className="guest-information-card-heading">
                <span className="guest-information-card-icon"><Icon size={27} strokeWidth={1.7} aria-hidden="true" /></span>
                <div><h3>{title}</h3><p>{eyebrow}</p></div>
              </div>
              <ul>{items.map((item) => <li key={item}><span aria-hidden="true"><Check size={12} strokeWidth={3} /></span>{item}</li>)}</ul>
              {image ? <PropertyPhoto image={image} alt={id === "self-check-in" ? entryPhoto?.alt || "Serenity furnished homes" : "Furnished bedroom at a Serenity home"} className="guest-information-card-photo" sizes="(max-width: 700px) 100vw, 33vw" /> : id === "home-care" ? (
                <div className="guest-information-card-art" aria-hidden="true"><Leaf size={56} strokeWidth={1.1} /><span>A brighter tomorrow begins at home.</span></div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="guest-information-support" aria-labelledby="guest-information-support-title">
        <div className="guest-information-support-icon"><Users size={38} strokeWidth={1.25} aria-hidden="true" /></div>
        <div><p>Thank you for choosing Serenity</p><h2 id="guest-information-support-title">We’re here to help throughout your stay.</h2></div>
        <p>Questions before arrival or while you’re here? Our team is ready to help you feel at home.</p>
        <div className="guest-information-support-actions">
          <Link href="/contact"><LifeBuoy size={18} aria-hidden="true" /> Contact support <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link href="/corporate-stays#corporate-booking"><ClipboardList size={18} aria-hidden="true" /> Partner booking enquiries <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
      <div className="guest-information-values" aria-label="Serenity stay values">
        <span><House size={18} aria-hidden="true" /> Professional stays</span>
        <span><Heart size={18} aria-hidden="true" /> Comfortable homes</span>
        <span><Sparkles size={18} aria-hidden="true" /> Trusted service</span>
        <span><Leaf size={18} aria-hidden="true" /> A brighter tomorrow</span>
      </div>
    </div>
  );
}
