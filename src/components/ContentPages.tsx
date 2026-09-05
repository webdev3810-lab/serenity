"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import Image from "next/image";
import { ArrowUpRight, Building2, CheckCircle2, Clock3, ExternalLink, Home, Mail, MapPin, MessageCircle, Phone, ShoppingBag, TrainFront, Trees, Utensils } from "lucide-react";
import { GsapFadeIn } from "@/src/components/GsapAnimations";
import ScrollWipeText from "@/src/components/homepage/ScrollWipeText";
import { FormInput, TextArea } from "@/src/components/UI";
import { properties } from "@/src/data/properties";
import { useContactSettings } from "@/src/context/ContactSettingsContext";
import { DEFAULT_CONTACT_SETTINGS, type ContactSettings } from "@/src/lib/siteSettings";

const LOCATION_FACTS = [
  ["Train station", "Around a 5-minute walk to Pakenham Station."],
  ["Local essentials", "Shops, supermarkets, cafés, and restaurants nearby."],
  ["Road access", "Easy access to the Princes Freeway and the wider Gippsland region."],
  ["Work and projects", "Convenient for Pakenham Industrial Park and surrounding businesses."],
];

const MAP_IMAGE_SIZE = { width: 1791, height: 878 };

const LOCATION_MAP_MARKERS = [
  {
    className: "location-map-marker--home",
    detail: "7 Tremont St",
    href: "https://www.google.com/maps/search/?api=1&query=7%20Tremont%20St%2C%20Pakenham%20VIC%203810%2C%20Australia",
    icon: MapPin,
    label: "Serenity houses",
    x: 0.55,
    y: 0.51,
  },
  {
    className: "location-map-marker--station",
    detail: "9 min walk",
    href: "https://www.google.com/maps/search/?api=1&query=Railway%20Ave%20%26%20Henry%20Rd%2C%20Pakenham%20VIC%203810%2C%20Australia",
    icon: TrainFront,
    label: "Pakenham Station",
    x: 0.29,
    y: 0.74,
  },
  {
    className: "location-map-marker--marketplace",
    detail: "50–54 John St",
    href: "https://maps.app.goo.gl/kemcZccCbPz44BKH6",
    icon: ShoppingBag,
    label: "Pakenham Marketplace",
    x: 0.18,
    y: 0.51,
  },
  {
    className: "location-map-marker--park",
    detail: "green space",
    href: "https://maps.app.goo.gl/hkb8K1WL4RtGurnXA",
    icon: Trees,
    label: "Ascot Park",
    x: 0.43,
    y: 0.46,
  },
  {
    className: "location-map-marker--bigw",
    detail: "everyday shopping",
    href: "https://maps.app.goo.gl/nNaFDCV9SWn9fGhdA",
    icon: Building2,
    label: "BIG W Pakenham",
    x: 0.19,
    y: 0.43,
  },
  {
    className: "location-map-marker--mummas",
    detail: "food nearby",
    href: "https://maps.app.goo.gl/PPKdUWJEP34zQ9bB8",
    icon: Utensils,
    label: "Mumma Gs Pizza",
    x: 0.66,
    y: 0.43,
  },
] as const;

export function CorporatePage() {
  return (
    <PageFrame
      eyebrow="Corporate & Team Stays"
      title="Adjacent Furnished Houses for Teams and Business Travellers"
      text="Accommodation for contractors, project crews, relocating employees, temporary assignments, training programs, and extended stays. Serenity 7, Serenity 9, and Serenity 11 are right next door to each other in Pakenham, allowing companies to request multiple nearby houses with unified billing."
    >
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6 grid gap-4 sm:grid-cols-2">
          {[
            "Three houses beside each other",
            "Fully furnished private houses",
            "Full kitchens & laundry facilities",
            "High-speed Wi-Fi in each house",
            "Separate private bedrooms",
            "Free on-site & street parking",
            "Flexible stay lengths & extensions",
            "Unified team coordination",
            "GST tax invoices & ABN details",
            "Flexible employee name updates",
          ].map((item) => (
            <div key={item} className="card p-4 font-bold text-xs text-stone-800 flex items-center gap-2 border border-stone-200">
              <CheckCircle2 size={16} className="text-[#7A4E2D] shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        
        <div className="lg:col-span-6">
          <DemoForm
            title="Corporate Stay Enquiry"
            fields={["Company name", "Contact person", "Business email", "Phone", "Number of guests", "Preferred property", "Arrival", "Departure", "Purpose of stay"]}
            textarea="Specific requirements, multi-house request, purchase order or GST invoice notes"
          />
        </div>
      </div>
    </PageFrame>
  );
}

export function LongTermPage() {
  return (
    <PageFrame
      eyebrow="Long-Term Stays"
      title="Weekly and Monthly Furnished Accommodation"
      text="Serenity Stays offers discounted weekly and monthly pricing for relocation housing, long-term project teams, insurance replacement accommodation, and temporary family stays."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {properties.map((property) => (
          <article key={property.slug} className="card overflow-hidden flex flex-col justify-between">
            <div>
              {property.featuredImage ? <Image src={property.featuredImage} alt={`${property.name} accommodation`} width={1200} height={800} sizes="(max-width: 768px) 100vw, 50vw" className="h-56 w-full object-cover" /> : <div className="h-56 w-full bg-[#E8DED6]" aria-label="Property photo not available" />}
              <div className="p-5 space-y-3">
                <span className="text-sm font-bold text-[#7A4E2D] uppercase tracking-wider">
                  <Building2 size={13} className="inline mr-1" /> Beside Serenity 7, 9 & 11
                </span>
                <h2 className="text-2xl font-bold text-stone-900">{property.name}</h2>
                <p className="text-base leading-relaxed text-stone-600 line-clamp-2">{property.shortDescription}</p>
                <div className="discount-summary pt-3 border-t border-stone-100 space-y-2 text-sm font-semibold text-stone-800">
                  <p className="flex justify-between">
                    <span>Save {property.weeklyDiscount}% on weekly stays</span>
                    <span className="discount-value text-[#7A4E2D] font-bold">{property.weeklyDiscount}%</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Save {property.monthlyDiscount}% on monthly stays</span>
                    <span className="discount-value text-[#7A4E2D] font-bold">{property.monthlyDiscount}%</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 pt-0">
              <Link href={`/properties/${property.slug}`} className="btn-secondary w-full justify-center text-xs">
                View House & Rates
              </Link>
            </div>
          </article>
        ))}
      </div>
    </PageFrame>
  );
}

export function AboutPage() {
  return (
    <PageFrame
      eyebrow="About Serenity Stays"
      title="Private Furnished Houses for Practical Pakenham Stays"
      text="Serenity Stays is a direct-booking accommodation platform offering three fully furnished private houses beside each other in Pakenham, Victoria, Australia. Guests book directly without creating customer accounts. Only the admin authenticates to manage properties and reservations."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {[
          ["Families & Group Travel", "Comfortable, spacious private houses with full kitchens, dining areas, and enclosed yards."],
          ["Corporate & Project Teams", "Private bedrooms and adjacent house options for crews needing nearby accommodation."],
          ["Relocations & Long Stays", "Fully equipped homes allowing guests to settle in comfortably with laundry and parking."],
        ].map(([item, desc]) => (
          <div key={item} className="card p-6 bg-white space-y-3 border border-stone-200">
            <Home className="text-[#7A4E2D]" size={24} />
            <h2 className="text-lg font-bold text-stone-900">{item}</h2>
            <p className="text-xs leading-relaxed text-stone-600">{desc}</p>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}

export function ContactPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const contact = useContactSettings() ?? DEFAULT_CONTACT_SETTINGS;
  const phoneHref = `tel:${contact.phoneNumber.replace(/[^+\d]/g, "")}`;
  const emailHref = `mailto:${contact.contactEmail}`;
  const whatsappDigits = contact.whatsappNumber.replace(/\D/g, "");
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits.startsWith("0") ? `61${whatsappDigits.slice(1)}` : whatsappDigits}` : "";
  const socialLinks = [
    ["Facebook", contact.facebookUrl],
    ["Instagram", contact.instagramUrl],
    ["LinkedIn", contact.linkedinUrl],
  ].filter(([, href]) => href);

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSent(false);
    setSubmitError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await fetch("/api/contact-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `contact:${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          firstName: values.get("firstName"),
          lastName: values.get("lastName"),
          email: values.get("email"),
          phone: values.get("phone"),
          projectType: values.get("projectType"),
          preferredHouse: values.get("house"),
          message: values.get("message"),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not send your message.");
      form.reset();
      setSent(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not send your message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="contact-editorial-page min-h-screen bg-white text-[#2D2622]">
      <div className="mx-auto w-full max-w-[120rem] px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14 lg:px-8 lg:pt-16">
        <div className="border-t border-[#D8CCC4] pt-10 lg:pt-16">
          <div className="mx-auto max-w-6xl text-center">
            <span className="eyebrow text-[#8B6B55]">Get in touch · {contact.businessName}</span>
            <ScrollWipeText as="h1" className="display-font mt-6 text-[clamp(3.25rem,7.5vw,8.5rem)] uppercase leading-[0.86] tracking-[-0.065em] text-[#2D2622]">
              {contact.contactPageHeading}
            </ScrollWipeText>
            <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-[#6F5A4D] sm:text-lg">
              {contact.contactPageDescription}
            </p>
          </div>

          <div className="mt-16 grid border-y border-[#D8CCC4] md:grid-cols-2 lg:grid-cols-4">
            <a href={phoneHref} className="group border-b border-[#D8CCC4] px-1 py-7 md:border-r md:px-6 lg:border-b-0">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8B6B55]"><Phone size={14} /> Contact</span>
              <span className="mt-4 block break-words text-base font-semibold text-[#2D2622] transition-colors group-hover:text-[#8B6B55]">{contact.phoneNumber}</span>
            </a>
            <div className="border-b border-[#D8CCC4] px-1 py-7 md:px-6 lg:border-b-0 lg:border-r">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8B6B55]"><MapPin size={14} /> Address</span>
              <span className="mt-4 block max-w-[22ch] break-words text-base font-semibold leading-snug text-[#2D2622]">{contact.publicAddress || "Exact location shared after booking"}</span>
            </div>
            <a href={emailHref} className="group border-b border-[#D8CCC4] px-1 py-7 md:border-r md:px-6 lg:border-b-0">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8B6B55]"><Mail size={14} /> Email</span>
              <span className="mt-4 block break-words text-base font-semibold text-[#2D2622] transition-colors group-hover:text-[#8B6B55]">{contact.contactEmail}</span>
            </a>
            <div className="px-1 py-7 md:px-6">
              <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8B6B55]"><ArrowUpRight size={14} /> Direct booking</span>
              <Link href="/houses" className="mt-4 block text-base font-semibold text-[#2D2622] transition-colors hover:text-[#8B6B55]">Browse the houses</Link>
            </div>
          </div>

          <div className="mt-8 grid border-y border-[#D8CCC4] md:grid-cols-2 lg:grid-cols-4">
            <div className="border-b border-[#D8CCC4] px-1 py-7 md:border-r md:px-6 lg:border-b-0"><span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8B6B55]"><Clock3 size={14} /> Hours</span><span className="mt-4 block break-words text-base font-semibold leading-snug text-[#2D2622]">{contact.businessHours}</span></div>
            {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="group border-b border-[#D8CCC4] px-1 py-7 md:border-r md:px-6 lg:border-b-0"><span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8B6B55]"><MessageCircle size={14} /> WhatsApp</span><span className="mt-4 block break-words text-base font-semibold text-[#2D2622] transition-colors group-hover:text-[#8B6B55]">{contact.whatsappNumber}</span></a>}
            <a href={contact.directionsUrl} target="_blank" rel="noopener noreferrer" className="group border-b border-[#D8CCC4] px-1 py-7 md:border-r md:px-6 lg:border-b-0"><span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8B6B55]"><ExternalLink size={14} /> Directions</span><span className="mt-4 block text-base font-semibold text-[#2D2622] transition-colors group-hover:text-[#8B6B55]">Open saved directions</span></a>
            <div className="px-1 py-7 md:px-6"><span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8B6B55]"><ArrowUpRight size={14} /> Social</span><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-base font-semibold text-[#2D2622]">{socialLinks.length ? socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="hover:text-[#8B6B55]">{label}</a>) : <span className="text-[#6F5A4D]">Follow updates soon</span>}</div></div>
          </div>

          <ContactLocationSection contact={contact} />

          <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
            <div className="max-w-lg">
              <span className="eyebrow text-[#8B6B55]">Contact form</span>
              <ScrollWipeText as="h2" className="display-font mt-5 text-4xl leading-[0.95] tracking-[-0.04em] sm:text-5xl">Let&apos;s start a conversation.</ScrollWipeText>
              <p className="mt-6 text-sm leading-relaxed text-[#6F5A4D] sm:text-base">
                Reach out with your dates, group size, or questions about the homes. We&apos;ll be in touch shortly.
              </p>
              <div className="mt-12 border-t border-[#D8CCC4] pt-5 text-sm leading-relaxed text-[#6F5A4D]">
                <p className="font-semibold text-[#2D2622]">Private houses. Local support.</p>
                <p className="mt-2">For families, work crews, relocations, and longer stays.</p>
              </div>
            </div>

            <form id="contact-form" className="scroll-mt-24 grid gap-7" onSubmit={submitContact}>
              <div className="grid gap-7 sm:grid-cols-2">
                <label className="contact-editorial-field">First name <span>*</span><input name="firstName" type="text" required placeholder="Your first name" /></label>
                <label className="contact-editorial-field">Last name <span>*</span><input name="lastName" type="text" required placeholder="Your last name" /></label>
              </div>
              <div className="grid gap-7 sm:grid-cols-2">
                <label className="contact-editorial-field">Email <span>*</span><input name="email" type="email" required placeholder="you@example.com" /></label>
                <label className="contact-editorial-field">Phone number<input name="phone" type="tel" placeholder="+61" /></label>
              </div>
              <div className="grid gap-7 sm:grid-cols-2">
                <label className="contact-editorial-field">Project type<select name="projectType" defaultValue=""><option value="" disabled>Select an option</option><option>Family stay</option><option>Corporate or team stay</option><option>Relocation or insurance</option><option>Long-term stay</option><option>Other</option></select></label>
                <label className="contact-editorial-field">Preferred house<select name="house" defaultValue=""><option value="" disabled>Select an option</option><option>Serenity 7</option><option>Serenity 9</option><option>Serenity 11</option><option>Not sure yet</option></select></label>
              </div>
              <label className="contact-editorial-field">Message <span>*</span><textarea name="message" required rows={5} placeholder="Tell us a little about your stay" /></label>
              {sent && <p className="border border-[#CBB9A9] bg-[#F3ECE5] p-4 text-sm font-semibold text-[#5A463A]" role="status">Thanks — your message has been sent to our team. We&apos;ll be in touch shortly.</p>}
              {submitError && <p className="border border-[#E7BDB4] bg-[#FBF0EE] p-4 text-sm font-semibold text-[#8A3325]" role="alert">{submitError}</p>}
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-3 bg-[#2D2622] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#5A463A] disabled:cursor-wait disabled:opacity-60">{submitting ? "Sending…" : "Send message"} <ArrowUpRight size={16} /></button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function ZoomableLocationMap() {
  const mapViewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mapElement = mapViewerRef.current;
    if (!mapElement) return;

    const markerRoots: Root[] = [];
    let disposed = false;
    let viewerInstance: { destroy: () => void } | undefined;

    void import("openseadragon").then(({ default: OpenSeadragon }) => {
      if (disposed) return;

      const viewer = OpenSeadragon({
        element: mapElement,
        animationTime: 0.35,
        constrainDuringPan: true,
        gestureSettingsMouse: {
          clickToZoom: false,
          dblClickToZoom: true,
          dragToPan: true,
          scrollToZoom: true,
        },
        gestureSettingsTouch: {
          clickToZoom: false,
          dragToPan: true,
          flickEnabled: true,
          pinchToZoom: true,
        },
        homeFillsViewer: true,
        maxZoomPixelRatio: 3,
        minZoomImageRatio: 1,
        showNavigationControl: false,
        showNavigator: false,
        tileSources: new OpenSeadragon.ImageTileSource({
          buildPyramid: true,
          url: "/mymap.png",
        }) as unknown as { getTileUrl: (level: number, x: number, y: number) => string },
        visibilityRatio: 1,
      });
      viewerInstance = viewer;

      viewer.addOnceHandler("open", () => {
        if (disposed) return;

        LOCATION_MAP_MARKERS.forEach((marker) => {
          const markerElement = document.createElement("div");
          markerElement.className = "location-map-osd-marker";
          const Icon = marker.icon;
          const root = createRoot(markerElement);
          root.render(
            <a
              className={`location-map-marker ${marker.className}`}
              href={marker.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${marker.label} in Google Maps`}
            >
              <span className="location-map-marker-pin" aria-hidden="true">
                <Icon size={17} strokeWidth={2.1} />
              </span>
              <span className="location-map-marker-copy">
                <strong>{marker.label}</strong>
                <small>{marker.detail}</small>
              </span>
            </a>,
          );
          markerRoots.push(root);

          viewer.addOverlay(
            markerElement,
            viewer.viewport.imageToViewportCoordinates(
              marker.x * MAP_IMAGE_SIZE.width,
              marker.y * MAP_IMAGE_SIZE.height,
            ),
            OpenSeadragon.Placement.TOP_LEFT,
          );
        });

        const serenityHouse = LOCATION_MAP_MARKERS.find(
          (marker) => marker.className === "location-map-marker--home",
        );

        if (serenityHouse) {
          const isMobile = window.matchMedia("(max-width: 767px)").matches;
          const housePoint = viewer.viewport.imageToViewportCoordinates(
            serenityHouse.x * MAP_IMAGE_SIZE.width,
            serenityHouse.y * MAP_IMAGE_SIZE.height,
          );

          viewer.viewport.zoomBy(isMobile ? 1.35 : 1.18, viewer.viewport.getCenter(), true);
          viewer.viewport.panTo(housePoint, true);
          viewer.viewport.applyConstraints();
        }
      });
    });

    return () => {
      disposed = true;
      viewerInstance?.destroy();
      // React may run an effect cleanup while committing another render. Defer
      // these small overlay roots so they are never synchronously unmounted mid-render.
      queueMicrotask(() => markerRoots.forEach((root) => root.unmount()));
    };
  }, []);

  return (
    <div
      ref={mapViewerRef}
      className="location-editorial-map location-openseadragon-map"
      aria-label="Interactive map of Pakenham. Drag to pan and pinch to zoom."
    />
  );
}

function ContactLocationSection({ contact }: { contact: ContactSettings }) {

  return (
    <section className="contact-location-panel location-editorial-page mt-20 border-y border-[#D8CCC4]" aria-label="Location and neighbourhood">
      <section className="location-editorial-hero">
        <GsapFadeIn className="location-editorial-shell">
          <ScrollWipeText
            as="h2"
            aria-label="Close to what brings you here."
            className="location-editorial-hero-title display-font"
          >
            Close to what brings you here.
          </ScrollWipeText>

          <div className="location-editorial-hero-footer">
            <p className="location-editorial-lead">
              Serenity houses sit in a quiet Pakenham neighbourhood, close to transport,
              everyday essentials, and the places guests need for work, family visits,
              and longer stays.
            </p>
            <div className="location-editorial-privacy">
              <MapPin size={17} aria-hidden="true" />
              <p>
                {contact.publicAddress ? `${contact.publicAddress}. ` : ""}
                Exact street details are shared after a confirmed booking to protect guest privacy.
              </p>
            </div>
          </div>
        </GsapFadeIn>
      </section>

      <section id="location-map" className="location-editorial-map-section" aria-label="Where you'll be">
        <GsapFadeIn className="location-editorial-map-heading location-editorial-shell">
          <ScrollWipeText
            as="h2"
            aria-label="Where you'll be."
            className="location-editorial-section-title font-marcellus"
          >
            Where you&apos;ll be.
          </ScrollWipeText>
          <p className="location-editorial-section-copy">
            Follow the markers for the Serenity homes, Pakenham Station, and the
            everyday places that make longer stays easy.
          </p>
        </GsapFadeIn>

        <ZoomableLocationMap />

        <div className="location-editorial-map-footer location-editorial-shell">
          <p>
            Pakenham VIC 3810 · approximately 55 kilometres south-east of Melbourne CBD.
          </p>
          <div>
            <a href={contact.directionsUrl} target="_blank" rel="noopener noreferrer">
              Get directions <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer">
              Open map <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="location-editorial-neighbourhood">
        <GsapFadeIn className="location-editorial-shell">
          <div className="location-editorial-neighbourhood-heading">
            <ScrollWipeText
              as="h2"
              aria-label="Everything you need is nearby."
              className="location-editorial-section-title font-marcellus"
            >
              Everything you need is nearby.
            </ScrollWipeText>
            <p className="location-editorial-section-copy">
              Stay close to the station and town centre without giving up the privacy
              of a whole house. Pakenham is a practical location for South East Melbourne,
              Cardinia, and Gippsland.
            </p>
          </div>

          <div className="location-editorial-facts">
            {LOCATION_FACTS.map(([label, detail], index) => (
              <article key={label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{label}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>

          <div className="location-editorial-actions">
            <p>Explore the houses and rooms, or ask us which setup fits your stay.</p>
            <div>
              <Link href="/houses" className="location-editorial-button location-editorial-button-primary">
                Explore the houses <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
              <a href="#contact-form" className="location-editorial-button">
                Ask a question <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </GsapFadeIn>
      </section>
    </section>
  );
}

export function PolicyPage({ type }: { type: "Terms and Conditions" | "Privacy Policy" | "Cancellation Policy" }) {
  return (
    <PageFrame eyebrow="Legal & Policies" title={type} text="Terms governing direct reservations, guest responsibilities, cancellation terms, and privacy protection at Serenity Stays.">
      <div className="card space-y-6 p-8 bg-white text-[#4A4036] text-xs border border-stone-200">
        {["Scope of Service", "Guest Responsibilities & House Rules", "Booking Requests & Stripe Payment", "Changes, Cancellations & Refunds", "Privacy & Data Handling", "Property Access & Security"].map((heading) => (
          <section key={heading} className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">{heading}</h2>
            <p className="leading-relaxed text-stone-600">
              This operational policy applies to all direct bookings for Serenity 7, Serenity 9, and Serenity 11 in Pakenham, Victoria, Australia. Guests must comply with declared guest limits, quiet hours (10:00 PM – 7:00 AM), and pet declaration rules.
            </p>
          </section>
        ))}
      </div>
    </PageFrame>
  );
}

// AdminDemoPage has been replaced by the full AdminDashboard in src/components/AdminDashboard.tsx
// The /admin-demo route now uses AdminDashboard directly.

function PageFrame({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="section page-frame bg-white pt-10 pb-20">
      <div className="container">
        <span className="eyebrow">{eyebrow}</span>
        <ScrollWipeText as="h1" className="page-heading mt-2 max-w-4xl text-stone-900">{title}</ScrollWipeText>
        <p className="page-intro mt-4 max-w-3xl text-stone-600">{text}</p>
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}

function DemoForm({ title, fields, textarea }: { title: string; fields: string[]; textarea: string }) {
  const [sent, setSent] = useState(false);
  return (
    <form className="card p-6 bg-white space-y-4 border border-stone-200" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
      <h2 className="text-xl font-bold text-stone-900">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <FormInput key={field} id={field} label={field} />
        ))}
      </div>
      <TextArea id={textarea} label={textarea} />
          {sent && <p className="rounded-none bg-[#FAF5EF] border border-[#EADCCF] p-3 text-xs font-bold text-[#7A4E2D]">Enquiry submitted successfully. A representative will contact you shortly.</p>}
          <button type="submit" className="btn-primary w-full justify-center text-xs">Submit Corporate Enquiry</button>
    </form>
  );
}
