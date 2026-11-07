import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, CreditCard, FileText, House } from "lucide-react";
import { pageMetadata } from "@/src/lib/seo";
import { getPublicProperties } from "@/src/lib/supabase/content";
import "./coordinator-guide.css";

export const metadata = pageMetadata(
  "Booking Coordinator Guide | Serenity Corporate Bookings",
  "Property details, stay terms, billing information and extension enquiries for Serenity corporate bookings.",
);
export const dynamic = "force-dynamic";

const topics = [
  { id: "property-information", label: "The homes", detail: "Photos, layouts and amenities", Icon: House },
  { id: "inclusions-and-terms", label: "Stay details", detail: "Inclusions and policies", Icon: FileText },
  { id: "billing-requirements", label: "Billing", detail: "Invoices and partner bookings", Icon: CreditCard },
  { id: "stay-extensions", label: "Extensions", detail: "Request more time", Icon: CalendarDays },
];

export default async function CoordinatorGuidePage() {
  const properties = await getPublicProperties();

  return (
    <div className="coordinator-guide">
      <header className="coordinator-guide__hero">
        <div className="coordinator-guide__hero-copy">
          <p className="coordinator-guide__eyebrow">Corporate bookings / Coordinator guide</p>
          <h1>Arrange every detail with confidence.</h1>
          <p>Find the home information, stay terms and next steps your team needs before and during a booking.</p>
          <Link href="/corporate-stays"><ArrowLeft size={17} aria-hidden="true" /> Back to corporate stays</Link>
        </div>
        <figure className="coordinator-guide__hero-media">
          <Image
            src="/coordinator-guide-hero-v2.png"
            alt="Illustrative furnished living and dining area with two guests chatting on the sofa"
            fill
            priority
            sizes="(max-width: 850px) 100vw, 48vw"
          />
          <figcaption>Illustrative interior</figcaption>
        </figure>
      </header>

      <div className="coordinator-guide__intro">
        <div>
          <span className="coordinator-guide__label">THE COORDINATOR TOOLKIT</span>
          <h2>Everything in one place.</h2>
        </div>
        <p>Go straight to the details you need, from choosing a home to adjusting a stay.</p>
      </div>

      <nav className="coordinator-guide__nav" aria-label="Guide topics">
        {topics.map(({ id, label, detail, Icon }, index) => (
          <a href={`#${id}`} key={id}>
            <span className="coordinator-guide__nav-top"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /><span>{String(index + 1).padStart(2, "0")}</span></span>
            <strong>{label}</strong>
            <span className="coordinator-guide__nav-detail">{detail}<ArrowUpRight size={17} aria-hidden="true" /></span>
          </a>
        ))}
      </nav>

      <div className="coordinator-guide__content-grid">
        <section className="coordinator-guide__section coordinator-guide__section--wide" id="property-information" aria-labelledby="property-information-title">
          <div className="coordinator-guide__card coordinator-guide__card--homes">
            <div className="coordinator-guide__card-heading">
              <span className="coordinator-guide__card-icon"><House size={24} strokeWidth={1.6} aria-hidden="true" /></span>
              <span className="coordinator-guide__label">01 / COMPARE THE HOMES</span>
              <h2 id="property-information-title">Find the right home for your stay.</h2>
              <p>Explore photos, room and bed layouts, amenities and house rules. If your organisation needs a written property summary, request one with your enquiry.</p>
            </div>
            <div className="coordinator-guide__properties">
              {properties.map((property) => {
                const cover = property.images.find((image) => image.isCover) ?? property.images[0];
                const displayName = property.name.replace(" - Whole", "");
                const coverAlt = cover?.alt && !/^\d+$/.test(cover.alt.trim()) ? cover.alt : `${displayName} property photo`;

                return (
                  <Link href={`/properties/${property.slug}`} key={property.slug}>
                    <span className="coordinator-guide__property-media">
                      {cover ? <Image src={cover.src} alt={coverAlt} fill sizes="(max-width: 650px) 100vw, (max-width: 1100px) 30vw, 18vw" /> : <House size={30} strokeWidth={1.5} aria-hidden="true" />}
                    </span>
                    <strong>{displayName}</strong>
                    <span>{property.bedrooms} bedrooms · Up to {property.maxGuests} guests</span>
                    <span className="coordinator-guide__link-label">View home details <ArrowUpRight size={17} aria-hidden="true" /></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="coordinator-guide__section" id="inclusions-and-terms" aria-labelledby="inclusions-and-terms-title">
          <div className="coordinator-guide__card coordinator-guide__card--terms">
            <span className="coordinator-guide__card-icon"><FileText size={24} strokeWidth={1.6} aria-hidden="true" /></span>
            <span className="coordinator-guide__label">02 / KNOW WHAT IS INCLUDED</span>
            <h2 id="inclusions-and-terms-title">Clear inclusions &amp; terms.</h2>
            <p>Serenity offers furnished private homes with kitchens, laundry and Wi-Fi. Check each listing for exact amenities, parking and guest capacity.</p>
            <p>Review the guest terms and cancellation policy before booking. Confirm any arrangements specific to your company or stay with the Serenity team.</p>
            <div className="coordinator-guide__actions">
              <Link href="/guest-information#terms">Read stay terms <ArrowUpRight size={17} aria-hidden="true" /></Link>
              <Link href="/guest-information#cancellations">Cancellation policy <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="coordinator-guide__section" id="billing-requirements" aria-labelledby="billing-requirements-title">
          <div className="coordinator-guide__card coordinator-guide__card--billing">
            <span className="coordinator-guide__card-icon"><CreditCard size={24} strokeWidth={1.6} aria-hidden="true" /></span>
            <span className="coordinator-guide__label">03 / PLAN THE PAPERWORK</span>
            <h2 id="billing-requirements-title">Billing, made easier.</h2>
            <p>Tell us the company billing name, contact and any purchase order or invoice reference you need included. We can discuss these requirements when arranging a stay.</p>
            <p>Registered partners can book online using a Partner ID. Confirm any special billing arrangements with our team before booking.</p>
            <div className="coordinator-guide__actions">
              <Link href="/corporate-stays#corporate-question">Ask about billing <ArrowUpRight size={17} aria-hidden="true" /></Link>
              <Link href="/corporate-stays#corporate-booking">Partner booking <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="coordinator-guide__section coordinator-guide__section--wide" id="stay-extensions" aria-labelledby="stay-extensions-title">
          <div className="coordinator-guide__card coordinator-guide__card--extension">
            <div className="coordinator-guide__extension-copy">
              <span className="coordinator-guide__card-icon"><CalendarDays size={24} strokeWidth={1.6} aria-hidden="true" /></span>
              <span className="coordinator-guide__label">04 / ADJUST THE DATES</span>
              <h2 id="stay-extensions-title">Need a little longer?</h2>
              <p>Send us the details of your current stay. We will check availability and confirm the rate and arrangements before an extension is agreed.</p>
              <div className="coordinator-guide__actions">
                <Link href="/contact#contact-form">Request an extension <ArrowUpRight size={17} aria-hidden="true" /></Link>
              </div>
            </div>
            <div className="coordinator-guide__extension-details">
              <span>INCLUDE IN YOUR ENQUIRY</span>
              <ol>
                <li><span>01</span> The home name</li>
                <li><span>02</span> Current checkout date</li>
                <li><span>03</span> Requested new checkout date</li>
              </ol>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
