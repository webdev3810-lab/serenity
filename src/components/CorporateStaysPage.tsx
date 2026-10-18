"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  Car,
  Check,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { MiniCalendar } from "@/src/components/BookingWidgets";
import { FormInput, TextArea } from "@/src/components/UI";
import { useContactSettings } from "@/src/context/ContactSettingsContext";
import type { Property } from "@/src/data/properties";
import { calculatePrice, datesInRange, defaultGuests, formatAud, formatDateAu, nightsBetween } from "@/src/lib/booking";
import { DEFAULT_CONTACT_SETTINGS } from "@/src/lib/siteSettings";
import { canBookCorporateDirectly } from "@/src/lib/reservationRules";

type AvailabilityState = "checking" | "available" | "unavailable" | "error";

const CORPORATE_STAY_FEATURES = [
  { title: "Whole-home privacy", description: "More personal space than traditional hotel accommodation." },
  { title: "Work-ready internet", description: "Reliable Wi-Fi for everyday business use." },
  { title: "Kitchen & laundry", description: "Everyday facilities that make stays of several weeks or months easier." },
  { title: "Flexible arrangements", description: "Stay extensions can be requested, subject to availability." },
  { title: "Direct partner bookings", description: "Returning clients can use an ID issued by Serenity in the booking form below." },
  { title: "Corporate invoicing", description: "GST tax invoices and purchase order details can be requested." },
  { title: "One point of contact", description: "One Serenity contact throughout the booking and stay." },
] as const;

export function CorporateStaysPage({ today, properties, heroImage, heroAlt }: { today: string; properties: Property[]; heroImage?: string; heroAlt?: string }) {
  const contact = useContactSettings() ?? DEFAULT_CONTACT_SETTINGS;
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [availability, setAvailability] = useState<Record<string, AvailabilityState>>({});
  const [submissionKey, setSubmissionKey] = useState("");
  const [partnerCompany, setPartnerCompany] = useState("");
  const [partnerLookupError, setPartnerLookupError] = useState("");
  const [partnerChecking, setPartnerChecking] = useState(false);
  const partnerLookupVersion = useRef(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarResetKey, setCalendarResetKey] = useState(0);
  const corporateDatePickerRef = useRef<HTMLDivElement>(null);
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");
  const [enquiryReference, setEnquiryReference] = useState("");
  const [enquirySubmissionKey, setEnquirySubmissionKey] = useState("");
  const [enquiryType, setEnquiryType] = useState<"corporate" | "insurance">("corporate");
  const [enquiryData, setEnquiryData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    preferredDates: "",
    accommodationNeeds: "",
    question: "",
  });
  const [formData, setFormData] = useState({
    customerId: "",
    arrival: "",
    departure: "",
    guests: "4",
    housesNeeded: "1",
    propertySlugs: [properties[0]?.slug ?? "serenity-7"],
    purpose: "Contractor project crew",
    notes: "",
  });

  const selectedProperties = properties.filter((property) => formData.propertySlugs.includes(property.slug));
  const corporateGuestCount = Number(formData.guests) || 1;
  const guestsPerHouse = { ...defaultGuests, adults: Math.max(1, Math.ceil(corporateGuestCount / Math.max(1, selectedProperties.length))) };
  const estimatedCorporateTotal = selectedProperties.reduce((total, property) => total + calculatePrice(property, formData.arrival, formData.departure, guestsPerHouse).total, 0);
  const corporateNights = nightsBetween(formData.arrival, formData.departure);
  const selectedDates = formData.arrival && formData.departure > formData.arrival ? datesInRange(formData.arrival, formData.departure) : [];
  const availabilityReady = selectedDates.length > 0 && selectedProperties.every((property) => Boolean(availability[property.slug]) && availability[property.slug] !== "checking");
  const allSelectedAvailable = availabilityReady && selectedProperties.every((property) => availability[property.slug] === "available");
  const directBookingEnabled = canBookCorporateDirectly(selectedProperties);
  const calendarProperty = selectedProperties[0] ?? properties[0];

  const verifyPartner = async () => {
    const version = ++partnerLookupVersion.current;
    setPartnerLookupError("");
    setPartnerCompany("");
    if (!formData.customerId.trim()) return;
    setPartnerChecking(true);
    try {
      const response = await fetch("/api/corporate-partners/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partnerId: formData.customerId }), cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not verify this Partner ID.");
      if (version === partnerLookupVersion.current) setPartnerCompany(String(result.companyName));
    } catch (error) {
      if (version === partnerLookupVersion.current) setPartnerLookupError(error instanceof Error ? error.message : "Could not verify this Partner ID.");
    } finally {
      if (version === partnerLookupVersion.current) setPartnerChecking(false);
    }
  };

  useEffect(() => {
    if (!calendarOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!corporateDatePickerRef.current?.contains(event.target as Node)) setCalendarOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [calendarOpen]);

  useEffect(() => {
    if (!formData.arrival || formData.departure <= formData.arrival || !properties.length) {
      return;
    }
    const controller = new AbortController();
    const propertySlugs = properties.map((property) => property.slug);
    const timer = window.setTimeout(async () => {
      setAvailability((current) => ({ ...current, ...Object.fromEntries(propertySlugs.map((slug) => [slug, "checking" as const])) }));
      const results = await Promise.all(propertySlugs.map(async (slug) => {
        try {
          const response = await fetch(`/api/properties/${encodeURIComponent(slug)}/availability?start=${formData.arrival}&end=${formData.departure}`, { signal: controller.signal, cache: "no-store" });
          const result = await response.json();
          if (!response.ok) return [slug, "error"] as const;
          return [slug, Array.isArray(result.blockedDates) && result.blockedDates.length ? "unavailable" : "available"] as const;
        } catch (error) {
          if ((error as Error).name === "AbortError") return [slug, "checking"] as const;
          return [slug, "error"] as const;
        }
      }));
      if (!controller.signal.aborted) setAvailability((current) => ({ ...current, ...Object.fromEntries(results) }));
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [formData.arrival, formData.departure, properties]);

  const updateHouseCount = (value: string) => {
    const count = Number(value);
    const nextSlugs = formData.propertySlugs.filter((slug) => properties.some((property) => property.slug === slug)).slice(0, count);
    for (const property of properties) {
      if (nextSlugs.length >= count) break;
      if (!nextSlugs.includes(property.slug)) nextSlugs.push(property.slug);
    }
    setFormData({ ...formData, housesNeeded: value, propertySlugs: nextSlugs });
  };

  const updateHouseSelection = (slug: string, checked: boolean) => {
    const nextSlugs = checked
      ? [...formData.propertySlugs, slug]
      : formData.propertySlugs.filter((selectedSlug) => selectedSlug !== slug);
    if (!nextSlugs.length) return;
    setFormData({ ...formData, propertySlugs: nextSlugs, housesNeeded: String(nextSlugs.length) });
  };

  const submitCorporateBooking = async () => {
    setFormError("");
    if (!formData.customerId.trim()) {
      setFormError("Enter your Partner ID before booking.");
      return;
    }
    if (!partnerCompany) {
      setFormError("Verify your Partner ID before booking.");
      return;
    }
    if (!formData.arrival || !formData.departure || formData.departure <= formData.arrival) {
      setFormError("Please choose a departure date after the expected arrival date.");
      return;
    }
    if (formData.propertySlugs.length !== Number(formData.housesNeeded)) {
      setFormError(`Please select exactly ${formData.housesNeeded} house${formData.housesNeeded === "1" ? "" : "s"} for this enquiry.`);
      return;
    }
    if (corporateGuestCount < formData.propertySlugs.length) {
      setFormError("Select at least one guest for each house.");
      return;
    }
    if (!availabilityReady) {
      setFormError("Please wait while we check live availability for every selected house.");
      return;
    }
    if (!allSelectedAvailable) {
      setFormError("One or more selected houses are unavailable for these dates. Choose another house or date range.");
      return;
    }
    if (!directBookingEnabled) {
      setFormError("This house combination requires a corporate enquiry before it can be booked.");
      return;
    }

    setFormSubmitting(true);
    try {
      const key = submissionKey || crypto.randomUUID();
      setSubmissionKey(key);
      const response = await fetch("/api/corporate-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({
          ...formData,
          checkIn: formData.arrival,
          checkout: formData.departure,
          guestCount: corporateGuestCount,
          idempotencyKey: key,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start secure checkout.");
      if (typeof result.checkoutUrl !== "string" || !result.checkoutUrl.startsWith("https://checkout.stripe.com/")) throw new Error("Secure checkout is unavailable. Please try again.");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not reserve the corporate stay.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleBookingSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitCorporateBooking();
  };

  const selectEnquiryType = (type: "corporate" | "insurance") => {
    if (type !== enquiryType) {
      setEnquiryType(type);
      setEnquiryError("");
      setEnquirySubmissionKey("");
      setEnquirySubmitted(false);
    }
  };

  const openEnquiryType = (type: "corporate" | "insurance") => {
    selectEnquiryType(type);
    document.getElementById("corporate-question")?.scrollIntoView({ block: "start" });
  };

  const handleEnquirySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEnquiryError("");
    if ((enquiryType === "corporate" && !enquiryData.companyName.trim()) || !enquiryData.contactName.trim() || !enquiryData.email.trim() || !enquiryData.question.trim()) {
      setEnquiryError(enquiryType === "insurance" ? "Complete your name, email, and accommodation needs." : "Complete your company, contact name, email, and question.");
      return;
    }

    setEnquirySubmitting(true);
    try {
      const key = enquirySubmissionKey || crypto.randomUUID();
      setEnquirySubmissionKey(key);
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({
          enquiryType: enquiryType === "insurance" ? "insurance_question" : "corporate_question",
          companyName: enquiryData.companyName,
          contactName: enquiryData.contactName,
          email: enquiryData.email,
          phone: enquiryData.phone,
          notes: enquiryType === "insurance"
            ? [
                `Preferred dates: ${enquiryData.preferredDates.trim() || "To be confirmed"}`,
                `People / bedrooms needed: ${enquiryData.accommodationNeeds.trim() || "To be confirmed"}`,
                `Accommodation request: ${enquiryData.question.trim()}`,
              ].join("\n")
            : enquiryData.question,
          idempotencyKey: key,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit your corporate question.");
      setEnquiryReference(String(result.enquiry?.reference ?? ""));
      setEnquirySubmitted(true);
    } catch (error) {
      setEnquiryError(error instanceof Error ? error.message : "Could not submit your corporate question.");
    } finally {
      setEnquirySubmitting(false);
    }
  };

  const corporateFaqs = [
    ["Can I request temporary accommodation while my home is being repaired?", "Yes. Tell us your preferred dates, household size and bedroom needs through the insurance accommodation enquiry. We can discuss suitable furnished homes and provide a written quote, subject to availability."],
    ["Do insurance accommodation enquiries need a Partner ID?", "No. A Partner ID is only needed for registered corporate partners booking and paying online. Insurance accommodation is arranged by enquiry and confirmed separately."],
    ["Do you offer corporate accommodation in Pakenham?", "Yes. Serenity Stays provides direct accommodation in Pakenham for project teams, contractor crews, executive relocations, and extended business stays."],
    ["Can our company book multiple houses for work crews?", "Yes. Serenity 7, Serenity 9, and Serenity 11 sit beside each other, so companies can hold two or all three houses together."],
    ["Are the houses furnished with utilities and Wi-Fi included?", "Every house is turn-key furnished with Wi-Fi, electricity, gas, water, a full kitchen, laundry facilities, and linen included."],
    ["Can we enquire about weekly or monthly stays?", "Yes. Tell us the dates and number of houses you need, and the team will confirm the rate and arrangements in your enquiry."],
    ["Can our company request GST tax invoices and ABN billing?", "Yes. We can provide tax invoices with ABN details and support purchase order processing for company bookings."],
    ["Is parking available for work vans and utility trucks?", "Each house has off-street driveway parking plus street parking out front for commercial vehicles, utility trucks, and team cars."],
    ["Are pets allowed for relocating employees?", "Yes. All three Serenity properties welcome declared family pets and have enclosed yards."],
  ];

  const featuredHome = properties.find((property) => property.slug === "serenity-7") ?? properties[0];

  return (
    <main className="corporate-stays-page corporate-editorial-page homepage-theme">
      <header className="corporate-editorial-masthead">
        <h1>Insurance &amp; corporate stays</h1>
        <span>Pakenham · Victoria</span>
      </header>

      <section className="corporate-editorial-hero" aria-labelledby="corporate-hero-title">
        <div className="corporate-editorial-hero__image">
          {(heroImage || featuredHome?.featuredImage) ? (
            <Image
              src={heroImage || featuredHome.featuredImage}
              alt={heroImage ? heroAlt || "Serenity furnished homes in Pakenham" : "Serenity house in Pakenham"}
              fill
              priority
              sizes="(max-width: 760px) 100vw, 58vw"
              unoptimized={(heroImage || featuredHome.featuredImage).startsWith("http")}
            />
          ) : null}
          <span>Three private homes.<br />One point of contact.</span>
        </div>
        <div className="corporate-editorial-hero__copy">
          <span className="corporate-editorial-eyebrow">A private place to settle in</span>
          <h2 id="corporate-hero-title">A home while life moves forward.</h2>
          <p>Furnished whole-home stays for families needing temporary accommodation, relocating employees and project teams. One local contact from enquiry to checkout.</p>
          <div className="corporate-editorial-links">
            <Link href="#corporate-question" onClick={() => openEnquiryType("insurance")}>Request an insurance quote <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link href="#corporate-booking">Book a corporate stay <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section id="insurance-accommodation" className="corporate-insurance" aria-labelledby="corporate-insurance-title">
        <div className="corporate-insurance__heading">
          <span>Flexible accommodation, personally arranged</span>
          <h2 id="corporate-insurance-title">One enquiry. A suitable home. A clear quote.</h2>
          <p>Tell us what you need and we&apos;ll help find the right furnished home and confirm the arrangements before you commit.</p>
        </div>
        <div className="corporate-insurance__paths">
          <article className="corporate-insurance__path corporate-insurance__path--insurance">
            <span className="corporate-insurance__number">01 / Insurance stays</span>
            <div>
              <h3>Insurance &amp; temporary relocation.</h3>
              <p>A private, furnished base for families who need somewhere to stay while home repairs or a claim are being resolved.</p>
            </div>
            <ul>
              <li>Household and bedroom needs reviewed with you</li>
              <li>Written accommodation quote on request</li>
              <li>Stay extensions subject to availability</li>
            </ul>
            <Link href="#corporate-question" onClick={() => openEnquiryType("insurance")}>Request an insurance quote <ArrowUpRight size={19} aria-hidden="true" /></Link>
          </article>
          <article className="corporate-insurance__path corporate-insurance__path--corporate">
            <span className="corporate-insurance__number">02 / Corporate stays</span>
            <div>
              <h3>Space for the people doing the work.</h3>
              <p>Practical whole-home accommodation for project teams, contractors and employees working away from home.</p>
            </div>
            <ul>
              <li>Separate bedrooms and everyday facilities</li>
              <li>Multiple adjacent homes can be requested</li>
              <li>Billing and invoice requirements discussed upfront</li>
            </ul>
            <Link href="#corporate-question" onClick={() => openEnquiryType("corporate")}>Ask about a corporate stay <ArrowUpRight size={19} aria-hidden="true" /></Link>
          </article>
        </div>
        <div className="corporate-insurance__homes">
          <div className="corporate-insurance__homes-heading">
            <h3>Three homes. Flexible options.</h3>
            <p>Explore the layout and features of each home before you enquire.</p>
          </div>
          <div className="corporate-insurance__homes-grid">
            {properties.map((property) => (
              <Link href={`/properties/${property.slug}`} className="corporate-insurance__home" key={property.slug}>
                <span className="corporate-insurance__home-image">
                  {property.featuredImage ? <Image src={property.featuredImage} alt={`${property.name.replace(" - Whole", "")} exterior`} fill sizes="(max-width: 760px) 100vw, 33vw" /> : null}
                </span>
                <span className="corporate-insurance__home-details">
                  <strong>{property.name.replace(" - Whole", "")}</strong>
                  <small>{property.bedrooms} bedrooms · Up to {property.maxGuests} guests</small>
                  <span>View house &amp; bed layout <ArrowUpRight size={17} aria-hidden="true" /></span>
                </span>
              </Link>
            ))}
          </div>
          <p className="corporate-insurance__homes-note">Parking, accessibility and individual bedroom needs can be discussed when you enquire.</p>
        </div>
      </section>

      <section className="corporate-stay-features" aria-labelledby="corporate-stay-features-title">
        <div className="corporate-stay-features__grid">
          <div className="corporate-stay-features__intro">
            <span>Made for the longer stay</span>
            <h2 id="corporate-stay-features-title">Designed for work. Ready for living.</h2>
          </div>
          {CORPORATE_STAY_FEATURES.map((feature, index) => (
            <article className="corporate-stay-features__item" key={feature.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="corporate-question" className="corporate-editorial-enquiry bg-white py-20 sm:py-28">
        <div className="container max-w-[92rem] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5 flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black block mb-4">Enquiry</span>
              <h2>{enquiryType === "insurance" ? "Request a place to stay." : "Ask about a corporate stay."}</h2>
              <p className="text-base text-stone-600 leading-relaxed max-w-md mb-8">{enquiryType === "insurance" ? "Tell us about the people, dates and type of home you need. We’ll respond with suitable options and a written quote; no stay is reserved by submitting this form." : "Use this short enquiry form for rates, invoices, longer stays, team arrangements, or anything you want to clarify before booking."}</p>
              <ul className="space-y-4 text-sm text-stone-600">
                <li className="flex items-start gap-3"><CalendarCheck size={18} className="text-[var(--hero-green)] shrink-0 mt-0.5" /> Flexible dates discussed with you</li>
                <li className="flex items-start gap-3"><ShieldCheck size={18} className="text-[var(--hero-green)] shrink-0 mt-0.5" /> Clear details before you commit</li>
                <li className="flex items-start gap-3"><Car size={18} className="text-[var(--hero-green)] shrink-0 mt-0.5" /> Parking and access needs considered</li>
              </ul>
            </div>
            
            <div className="lg:col-span-7">
              <div className="corporate-form-surface">
                {enquirySubmitted ? (
                  <div className="py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center bg-[var(--hero-green)] text-white"><CheckCircle2 size={24} /></div>
                    <h4 className="mt-5 text-xl font-semibold">Your enquiry has been sent.</h4>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black">Thank you, {enquiryData.contactName || "we've received your enquiry"}. The Serenity team will reply to your email with the next steps.</p>
                    {enquiryReference && <p className="mt-4 inline-block border-y border-neutral-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-black">Reference {enquiryReference}</p>}
                    <div><button type="button" className="mt-6 border border-black px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] hover:bg-black hover:text-white" onClick={() => { setEnquirySubmitted(false); setEnquirySubmissionKey(""); setEnquiryReference(""); setEnquiryData({ companyName: "", contactName: "", email: "", phone: "", preferredDates: "", accommodationNeeds: "", question: "" }); }}>Send another enquiry</button></div>
                  </div>
                ) : (
                  <form onSubmit={handleEnquirySubmit} className="mt-6 space-y-5">
                    <div className="corporate-enquiry-type" role="group" aria-label="Enquiry type">
                      <button type="button" aria-pressed={enquiryType === "insurance"} onClick={() => selectEnquiryType("insurance")}>Insurance accommodation</button>
                      <button type="button" aria-pressed={enquiryType === "corporate"} onClick={() => selectEnquiryType("corporate")}>Corporate stay</button>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormInput id="corp-enquiry-company" label={enquiryType === "insurance" ? "Insurer / organisation (optional)" : "Company name *"} required={enquiryType === "corporate"} value={enquiryData.companyName} onChange={(event) => setEnquiryData({ ...enquiryData, companyName: event.target.value })} placeholder={enquiryType === "insurance" ? "If applicable" : "Your company"} />
                      <FormInput id="corp-enquiry-contact" label="Contact name *" required value={enquiryData.contactName} onChange={(event) => setEnquiryData({ ...enquiryData, contactName: event.target.value })} placeholder="Full name" />
                      <FormInput id="corp-enquiry-email" label={enquiryType === "insurance" ? "Email address *" : "Business email *"} type="email" required value={enquiryData.email} onChange={(event) => setEnquiryData({ ...enquiryData, email: event.target.value })} placeholder={enquiryType === "insurance" ? "you@example.com" : "name@company.com.au"} />
                      <FormInput id="corp-enquiry-phone" label="Phone number (optional)" type="tel" value={enquiryData.phone} onChange={(event) => setEnquiryData({ ...enquiryData, phone: event.target.value })} placeholder="+61 400 000 000" />
                    </div>
                    {enquiryType === "insurance" && (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormInput id="insurance-dates" label="Preferred dates (optional)" value={enquiryData.preferredDates} onChange={(event) => setEnquiryData({ ...enquiryData, preferredDates: event.target.value })} placeholder="Approximate dates are fine" />
                        <FormInput id="insurance-needs" label="People / bedrooms needed (optional)" value={enquiryData.accommodationNeeds} onChange={(event) => setEnquiryData({ ...enquiryData, accommodationNeeds: event.target.value })} placeholder="e.g. 4 people, 3 bedrooms" />
                      </div>
                    )}
                    <TextArea id="corp-enquiry-question" label={enquiryType === "insurance" ? "Accommodation needs *" : "Your question *"} required value={enquiryData.question} onChange={(event) => setEnquiryData({ ...enquiryData, question: event.target.value })} placeholder={enquiryType === "insurance" ? "Tell us what kind of home you need. You don’t need to share private claim details." : "What would you like to know about a corporate stay?"} rows={4} />
                    {enquiryError && <p className="border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700" role="alert" aria-live="polite">{enquiryError}</p>}
                    <button type="submit" className="inline-flex w-full items-center justify-center gap-2 bg-[var(--hero-green)] text-white px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] rounded-none transition-colors disabled:cursor-not-allowed disabled:opacity-60" disabled={enquirySubmitting}>{enquirySubmitting ? "Sending enquiry…" : enquiryType === "insurance" ? "Request accommodation quote" : "Send corporate question"}<ArrowUpRight size={15} /></button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="corporate-booking" className="corporate-editorial-booking bg-white py-20 sm:py-28 border-y border-neutral-200">
        <div className="container max-w-[92rem] px-5 sm:px-8 lg:px-12">
          <div className="corporate-partner-direct">
            <div className="corporate-partner-direct__intro">
              <div>
                <span className="corporate-partner-direct__eyebrow">Partner booking</span>
                <h2>Book for your team.</h2>
                <p>Enter your Partner ID, choose your houses and dates, then pay securely to confirm your stay.</p>
                <p className="corporate-partner-direct__note">Online corporate booking is available only to registered partners. Dates are confirmed after payment succeeds.</p>
              </div>
              <button type="button" onClick={() => document.getElementById("corp-customer-id")?.focus()}>Start booking <ArrowUpRight size={19} aria-hidden="true" /></button>
            </div>
            <ol className="corporate-partner-direct__steps" aria-label="Corporate booking steps">
              <li><span>01</span> Verify Partner ID</li>
              <li><span>02</span> Choose dates</li>
              <li><span>03</span> Select property</li>
              <li><span>04</span> Secure payment</li>
            </ol>
          </div>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-32">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black block mb-4">Partner booking</span>
              <h2>Plan your corporate stay.</h2>
              <p className="text-base text-stone-600 leading-relaxed mb-6 max-w-md">Have a Partner ID? Verify it here to check availability, select your houses, and pay securely. If you do not have an ID, send a corporate enquiry above.</p>
            </div>
            
            <div className="lg:col-span-8">
              <div className="corporate-form-surface">
                <form onSubmit={handleBookingSubmit} className="mt-8 space-y-8">
                  <div className="space-y-5">
                    <h4 className="text-xl text-stone-900 border-b border-stone-200 pb-3">1. Verify Partner ID</h4>
                    <div className="corporate-customer-id">
                      <FormInput id="corp-customer-id" label="Partner ID *" required maxLength={24} value={formData.customerId} onChange={(event) => { partnerLookupVersion.current += 1; setPartnerChecking(false); setFormData({ ...formData, customerId: event.target.value.toUpperCase() }); setPartnerCompany(""); setPartnerLookupError(""); }} onBlur={() => void verifyPartner()} placeholder="SER-XXXXXXXXXXXX" />
                      <p className="mt-2 text-xs leading-5 text-stone-600">Enter the ID issued by Serenity. Your registered company details will load after verification.</p>
                      {partnerChecking && <p className="mt-2 text-sm text-stone-600" role="status">Checking Partner ID…</p>}
                      {partnerCompany && <p className="mt-2 text-sm font-semibold text-[#002844]" role="status">Connected to {partnerCompany}</p>}
                      {partnerLookupError && <p className="mt-2 text-sm text-red-700" role="alert">{partnerLookupError}</p>}
                    </div>
                  </div>

                  <div className="space-y-5 pt-4">
                    <h4 className="text-xl text-stone-900 border-b border-stone-200 pb-3">2. Stay Dates & Team</h4>
                    <div ref={corporateDatePickerRef} className={`relative ${calendarOpen ? "z-30" : "z-0"}`}>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <button
                          type="button"
                          className={`field min-h-[4.55rem] text-left ${calendarOpen ? "border-stone-900 bg-white ring-1 ring-stone-900" : "bg-white hover:border-stone-400"}`}
                          onClick={() => setCalendarOpen(true)}
                          aria-expanded={calendarOpen}
                          aria-controls="corporate-date-calendar"
                        >
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-600"><CalendarCheck size={14} /> Expected arrival *</span>
                          <strong className="mt-1.5 block text-sm font-semibold text-stone-900">{formData.arrival ? formatDateAu(formData.arrival) : "Add date"}</strong>
                        </button>
                        <button
                          type="button"
                          className={`field min-h-[4.55rem] text-left ${calendarOpen ? "border-stone-900 bg-white ring-1 ring-stone-900" : "bg-white hover:border-stone-400"}`}
                          onClick={() => setCalendarOpen(true)}
                          aria-expanded={calendarOpen}
                          aria-controls="corporate-date-calendar"
                        >
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-600"><CalendarCheck size={14} /> Expected departure *</span>
                          <strong className="mt-1.5 block text-sm font-semibold text-stone-900">{formData.departure ? formatDateAu(formData.departure) : "Add date"}</strong>
                        </button>
                      </div>

                      {calendarOpen && calendarProperty && (
                        <div id="corporate-date-calendar" className="corporate-calendar-popover absolute left-0 top-[calc(100%+0.75rem)] z-50 w-full max-w-[44rem] sm:left-auto sm:right-0" role="dialog" aria-label="Select corporate stay dates">
                          <div className="booking-calendar-popover-header">
                            <div>
                              <h3 className="text-lg font-bold text-stone-900">Select check-in &amp; checkout dates</h3>
                              <p className="mt-1 text-sm text-neutral-600">Choose the dates for your team stay.</p>
                            </div>
                            <div className="booking-calendar-tabs">
                              <div className={`booking-calendar-tab ${!formData.arrival || formData.departure ? "is-active" : ""}`}>
                                <span>Check-in</span>
                                <strong>{formData.arrival ? formatDateAu(formData.arrival) : "Add date"}</strong>
                              </div>
                              <div className={`booking-calendar-tab ${formData.arrival && !formData.departure ? "is-active" : ""}`}>
                                <span>Checkout</span>
                                <strong>{formData.departure ? formatDateAu(formData.departure) : "Add date"}</strong>
                              </div>
                            </div>
                          </div>

                          <MiniCalendar
                            key={`corporate-${calendarResetKey}`}
                            property={calendarProperty}
                            today={today}
                            checkIn={formData.arrival}
                            checkout={formData.departure}
                            blockedDates={calendarProperty.unavailableDates}
                            showSelectionHeader={false}
                            showHint={false}
                            onCheckInSelect={(nextArrival) => setFormData((current) => ({ ...current, arrival: nextArrival, departure: "" }))}
                            onSelect={(nextArrival, nextDeparture) => {
                              setFormData((current) => ({ ...current, arrival: nextArrival, departure: nextDeparture }));
                              setFormError("");
                              setCalendarOpen(false);
                            }}
                          />

                          <div className="booking-calendar-popover-footer">
                            <button type="button" className="text-sm font-semibold text-stone-700 underline-offset-4 hover:underline" onClick={() => { setFormData((current) => ({ ...current, arrival: "", departure: "" })); setCalendarResetKey((value) => value + 1); }}>Clear dates</button>
                            <button type="button" className="btn-primary min-h-9 px-4 text-sm" onClick={() => setCalendarOpen(false)}>Close</button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid gap-5 sm:grid-cols-3">
                      <div><label className="label mb-1.5 block text-[11px] uppercase tracking-[0.1em] font-bold text-black" htmlFor="corp-guests">Guests / employees *</label><select id="corp-guests" className="field bg-white text-sm font-medium" value={formData.guests} onChange={(event) => setFormData({ ...formData, guests: event.target.value })}>{Array.from({ length: 21 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} guest{index === 0 ? "" : "s"}</option>)}</select></div>
                      <div><label className="label mb-1.5 block text-[11px] uppercase tracking-[0.1em] font-bold text-black" htmlFor="corp-houses">Houses needed *</label><select id="corp-houses" className="field bg-white text-sm font-medium" value={formData.housesNeeded} onChange={(event) => updateHouseCount(event.target.value)}><option value="1">1 house</option><option value="2">2 houses beside each other</option><option value="3">All 3 houses beside each other</option></select></div>
                      <div><label className="label mb-1.5 block text-[11px] uppercase tracking-[0.1em] font-bold text-black" htmlFor="corp-purpose">Stay purpose</label><select id="corp-purpose" className="field bg-white text-sm font-medium" value={formData.purpose} onChange={(event) => setFormData({ ...formData, purpose: event.target.value })}><option>Contractor project crew</option><option>Employee relocation</option><option>Business travel</option><option>Training or event</option><option>Other</option></select></div>
                    </div>
                  </div>

                  <div className="space-y-5 pt-4">
                    <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-3">
                      <h4 className="text-xl text-stone-900">3. Select Adjacent Houses</h4>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black">{selectedProperties.length} selected</span>
                    </div>
                    <p className="text-sm text-stone-600">The required house count updates automatically as you select properties.</p>
                    <div className="grid gap-4 sm:grid-cols-3 mt-4">
                      {properties.map((property) => {
                        const checked = formData.propertySlugs.includes(property.slug);
                        const state = availability[property.slug];
                        const unavailable = selectedDates.length > 0 && state === "unavailable";
                        const disabled = !checked && unavailable;
                        return (
                          <label key={property.slug} className={`corporate-house-choice relative flex flex-col overflow-hidden transition-all ${disabled ? "cursor-not-allowed opacity-60" : checked ? "is-selected cursor-pointer" : "cursor-pointer"}`}>
                            <div className="relative aspect-[4/3] w-full bg-stone-200">
                              {property.featuredImage && <Image src={property.featuredImage} alt={property.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />}
                              <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => updateHouseSelection(property.slug, event.target.checked)} className="sr-only" aria-label={`Select ${property.name.replace(" - Whole", "")}`} />
                              <span className="corporate-house-choice__check" aria-hidden="true">{checked && <Check size={20} strokeWidth={3} />}</span>
                            </div>
                            <div className="corporate-house-choice-caption p-4 bg-white flex flex-col flex-1">
                              <span className="corporate-house-choice__title-row"><span className="font-bold text-sm text-stone-900">{property.name.replace(" - Whole", "")}</span>{checked && <span className="corporate-house-choice__selected">Selected</span>}</span>
                              <span className="text-xs text-neutral-600 mt-1">Beside other houses</span>
                              {selectedDates.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                                  <span className={`text-[10px] uppercase tracking-[0.15em] font-bold ${state === "available" ? "text-[#002844]" : state === "unavailable" ? "text-red-700" : "text-neutral-600"}`}>{state === "available" ? "Available" : state === "unavailable" ? "Unavailable" : state === "error" ? "Retry" : "Checking..."}</span>
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {selectedDates.length > 0 && <div className={`mt-4 p-4 text-sm font-medium ${allSelectedAvailable ? "bg-[#e8eef2] text-[#002844] border border-[#b9cbd7]" : availabilityReady ? "bg-red-50 text-red-800 border border-red-200" : "bg-stone-50 text-stone-600 border border-stone-200"}`} aria-live="polite">{allSelectedAvailable ? "All selected houses are available in the shared Serenity calendar." : availabilityReady ? "At least one selected house is unavailable. Choose another house or date range." : "Checking bookings, manual blocks, and connected calendars…"}</div>}
                    
                    {corporateNights > 0 && selectedProperties.length > 0 && (
                      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-stone-300 bg-white p-6 shadow-sm">
                        <div>
                          <p className="corporate-editorial-serif text-lg text-stone-900">Indicative estimate</p>
                          <p className="mt-1 text-sm text-stone-600">{selectedProperties.length} house{selectedProperties.length === 1 ? "" : "s"} · {corporateNights} night{corporateNights === 1 ? "" : "s"}</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-stone-900">{formatAud(estimatedCorporateTotal)}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 pt-4">
                    <h4 className="text-xl text-stone-900 border-b border-stone-200 pb-3">4. Anything else?</h4>
                    <TextArea id="corp-notes" label="Notes or requirements" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} placeholder="Tell us about roster flexibility, parking, billing, or anything else your team needs..." rows={4} />
                  </div>

                  <div className="pt-4 border-t border-stone-200">
                    {formError && <p className="mb-5 border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800" role="alert" aria-live="polite">{formError}</p>}
                    <button type="submit" className="inline-flex w-full items-center justify-center gap-2 bg-[var(--hero-green)] text-white px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] rounded-none transition-colors disabled:cursor-not-allowed disabled:opacity-60" disabled={formSubmitting || partnerChecking || !partnerCompany || !allSelectedAvailable || !directBookingEnabled}>
                      {formSubmitting ? "Opening checkout…" : directBookingEnabled ? "Continue to secure payment" : "Enquiry required"}<ArrowUpRight size={15} />
                    </button>
                    <p className="mt-3 text-xs text-stone-600">Prices are in AUD. Your booking is confirmed only after Stripe verifies successful payment.</p>
                    {!directBookingEnabled && selectedProperties.length > 0 && <p className="mt-4 text-xs leading-relaxed text-stone-600">The selected house rules require review before confirmation. Use the separate corporate enquiry form above and the Serenity team can help.</p>}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="corporate-editorial-faq bg-white py-20 sm:py-28">
        <div className="container max-w-[92rem] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black block mb-4">Before your stay</span>
              <h2>Clear answers before arrival.</h2>
            </div>
            <div className="lg:col-span-8">
              <div className="serenity-editorial-faq__list" aria-label="Corporate stay frequently asked questions">
                {corporateFaqs.map(([question, answer], index) => (
                  <details key={question} className="serenity-editorial-faq__item">
                    <summary>
                      <span className="serenity-editorial-faq__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <span className="serenity-editorial-faq__question">{question}</span>
                      <span className="serenity-editorial-faq__toggle" aria-hidden="true">+</span>
                    </summary>
                    <div className="serenity-editorial-faq__answer">{answer}</div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="corporate-editorial-closing bg-white text-white">
        <div className="container max-w-[92rem] px-5 py-20 sm:px-8 sm:py-28 lg:flex lg:items-end lg:justify-between lg:gap-16 lg:px-12">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white block mb-6">Personalised guest support</span>
            <h2 className="max-w-3xl">A comfortable home for the next chapter.</h2>
          </div>
          <div className="mt-10 max-w-sm lg:mt-0">
            <p className="text-base leading-relaxed text-white">Whether you&apos;re arranging a temporary family stay or accommodation for a team, we&apos;re here to help from the first enquiry onward.</p>
            <div className="mt-8 space-y-4 text-sm font-medium tracking-wide text-white">
              <p className="flex items-center gap-4"><Phone size={18} className="text-white" /> <a href={`tel:${contact.phoneNumber.replace(/[^+\d]/g, "")}`} className="hover:underline transition-colors">{contact.phoneNumber}</a></p>
              <p className="flex items-center gap-4"><Mail size={18} className="text-white" /> <a href={`mailto:${contact.corporateEnquiryEmail}`} className="break-words hover:underline transition-colors">{contact.corporateEnquiryEmail}</a></p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
