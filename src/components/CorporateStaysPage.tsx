"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { MiniCalendar } from "@/src/components/BookingWidgets";
import { FormInput, Modal, TextArea } from "@/src/components/UI";
import { useContactSettings } from "@/src/context/ContactSettingsContext";
import type { Property } from "@/src/data/properties";
import { calculatePrice, defaultGuests, formatAud, formatDateAu, nightsBetween } from "@/src/lib/booking";
import { DEFAULT_CONTACT_SETTINGS } from "@/src/lib/siteSettings";
import { canBookCorporateDirectly } from "@/src/lib/reservationRules";
import { freeCancellationText } from "@/src/lib/cancellationPolicy";
import { PUBLIC_PAGE_MEDIA, type PublicPageMedia } from "@/src/lib/publicPageMedia";
import type { PublicPageCopy } from "@/src/lib/publicPageCopy";
import { australianMobileLocalDigits, formatAustralianMobileLocal, normalizeAustralianMobile } from "@/src/lib/australianMobile";

type AvailabilityState = "checking" | "available" | "unavailable" | "error";
type HouseStay = { arrival: string; departure: string; guests: number };
type CalendarAvailability = { slug: string; status: "loading" | "ready" | "error"; blockedDates: string[] };

export function CorporateStaysPage({ today, properties, media, copy }: { today: string; properties: Property[]; media: PublicPageMedia; copy: PublicPageCopy }) {
  const corporateStayFeatures = [
    { title: copy.corporateFeature1Title, description: copy.corporateFeature1Lead },
    { title: copy.corporateFeature2Title, description: copy.corporateFeature2Lead },
    { title: copy.corporateFeature3Title, description: copy.corporateFeature3Lead },
    { title: copy.corporateFeature4Title, description: copy.corporateFeature4Lead },
    { title: copy.corporateFeature5Title, description: copy.corporateFeature5Lead },
    { title: copy.corporateFeature6Title, description: copy.corporateFeature6Lead },
    { title: copy.corporateFeature7Title, description: copy.corporateFeature7Lead },
  ];
  const contact = useContactSettings() ?? DEFAULT_CONTACT_SETTINGS;
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [availability, setAvailability] = useState<Record<string, AvailabilityState>>({});
  const [availabilityConflict, setAvailabilityConflict] = useState<Record<string, string>>({});
  const [calendarAvailability, setCalendarAvailability] = useState<CalendarAvailability | null>(null);
  const [calendarFetchKey, setCalendarFetchKey] = useState(0);
  const submission = useRef<{ fingerprint: string; key: string } | null>(null);
  const [partnerCompany, setPartnerCompany] = useState("");
  const [partnerLookupError, setPartnerLookupError] = useState("");
  const [partnerChecking, setPartnerChecking] = useState(false);
  const partnerLookupVersion = useRef(0);
  const [calendarSlug, setCalendarSlug] = useState<string | null>(null);
  const [calendarResetKey, setCalendarResetKey] = useState(0);
  const [houseStays, setHouseStays] = useState<Record<string, HouseStay>>({});
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
    propertySlugs: [properties[0]?.slug ?? "serenity-7"],
    purpose: "Contractor project crew",
    purposeOther: "",
    notes: "",
  });

  const selectedProperties = properties.filter((property) => formData.propertySlugs.includes(property.slug));
  const stayFor = (property: Property): HouseStay => houseStays[property.slug] ?? { arrival: "", departure: "", guests: Math.max(1, property.minimumGuests) };
  const datesReady = selectedProperties.length > 0 && selectedProperties.every((property) => {
    const stay = stayFor(property);
    return stay.arrival && stay.departure > stay.arrival && nightsBetween(stay.arrival, stay.departure) >= property.minimumCorporateStay;
  });
  const estimatedCorporateTotal = datesReady
    ? selectedProperties.reduce((total, property) => {
        const stay = stayFor(property);
        return total + calculatePrice(property, stay.arrival, stay.departure, { ...defaultGuests, adults: stay.guests }).total;
      }, 0)
    : 0;
  const availabilityFailed = datesReady && selectedProperties.some((property) => availability[property.slug] === "error");
  const availabilityReady = datesReady && selectedProperties.every((property) => availability[property.slug] === "available" || availability[property.slug] === "unavailable");
  const allSelectedAvailable = availabilityReady && selectedProperties.every((property) => availability[property.slug] === "available");
  const directBookingEnabled = canBookCorporateDirectly(selectedProperties);
  const calendarProperty = properties.find((property) => property.slug === calendarSlug);
  const calendarStay = calendarProperty ? stayFor(calendarProperty) : null;
  const calendarConflictDate = calendarStay && calendarStay.arrival && calendarStay.departure && calendarAvailability?.status === "ready"
    ? calendarAvailability.blockedDates.find((date) => date >= calendarStay.arrival && date < calendarStay.departure)
    : "";

  const openCalendar = (slug: string) => {
    setCalendarAvailability({ slug, status: "loading", blockedDates: [] });
    setCalendarSlug(slug);
  };

  const retryCalendar = () => {
    if (!calendarSlug) return;
    setCalendarAvailability({ slug: calendarSlug, status: "loading", blockedDates: [] });
    setCalendarFetchKey((value) => value + 1);
  };

  useEffect(() => {
    if (!calendarSlug) return;
    const controller = new AbortController();
    fetch(`/api/properties/${encodeURIComponent(calendarSlug)}/availability`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || result.warning || result.source !== "supabase" || !Array.isArray(result.blockedDates)) throw new Error("Live availability is unavailable.");
        return result.blockedDates as string[];
      })
      .then((blockedDates) => {
        if (!controller.signal.aborted) setCalendarAvailability({ slug: calendarSlug, status: "ready", blockedDates });
      })
      .catch((error) => {
        if (!controller.signal.aborted && (error as Error).name !== "AbortError") setCalendarAvailability({ slug: calendarSlug, status: "error", blockedDates: [] });
      });
    return () => controller.abort();
  }, [calendarSlug, calendarFetchKey]);

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
    const controller = new AbortController();
    const stays = properties.filter((property) => formData.propertySlugs.includes(property.slug))
      .map((property) => ({ slug: property.slug, ...(houseStays[property.slug] ?? { arrival: "", departure: "", guests: Math.max(1, property.minimumGuests) }) }))
      .filter((stay) => stay.arrival && stay.departure > stay.arrival);
    if (!stays.length) return () => controller.abort();
    const timer = window.setTimeout(async () => {
      setAvailability((current) => ({ ...current, ...Object.fromEntries(stays.map((stay) => [stay.slug, "checking" as const])) }));
      const results = await Promise.all(stays.map(async (stay) => {
        try {
          const response = await fetch(`/api/properties/${encodeURIComponent(stay.slug)}/availability?start=${stay.arrival}&end=${stay.departure}`, { signal: controller.signal, cache: "no-store" });
          const result = await response.json();
          if (!response.ok || result.warning || result.source !== "supabase" || !Array.isArray(result.blockedDates)) return [stay.slug, "error", ""] as const;
          return [stay.slug, result.blockedDates.length ? "unavailable" : "available", String(result.blockedDates[0] ?? "")] as const;
        } catch (error) {
          if ((error as Error).name === "AbortError") return [stay.slug, "checking", ""] as const;
          return [stay.slug, "error", ""] as const;
        }
      }));
      if (!controller.signal.aborted) {
        setAvailability((current) => ({ ...current, ...Object.fromEntries(results.map(([slug, state]) => [slug, state])) }));
        setAvailabilityConflict((current) => ({ ...current, ...Object.fromEntries(results.map(([slug, , date]) => [slug, date])) }));
      }
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [houseStays, formData.propertySlugs, properties]);

  const updateHouseSelection = (slug: string, checked: boolean) => {
    const nextSlugs = checked
      ? [...formData.propertySlugs, slug]
      : formData.propertySlugs.filter((selectedSlug) => selectedSlug !== slug);
    if (!nextSlugs.length) return;
    setFormData({ ...formData, propertySlugs: nextSlugs });
    setAvailability((current) => { const next = { ...current }; delete next[slug]; return next; });
    setAvailabilityConflict((current) => { const next = { ...current }; delete next[slug]; return next; });
  };

  const updateHouseStay = (slug: string, patch: Partial<HouseStay>) => {
    const property = properties.find((item) => item.slug === slug);
    if (!property) return;
    setHouseStays((current) => ({ ...current, [slug]: { ...(current[slug] ?? { arrival: "", departure: "", guests: Math.max(1, property.minimumGuests) }), ...patch } }));
    setAvailability((current) => { const next = { ...current }; delete next[slug]; return next; });
    setAvailabilityConflict((current) => { const next = { ...current }; delete next[slug]; return next; });
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
    if (!selectedProperties.length || !datesReady) {
      setFormError("Select at least one house and choose valid dates for every selected house.");
      return;
    }
    if (availabilityFailed) {
      setFormError("Live availability could not be checked. Please choose dates again and retry.");
      return;
    }
    if (!availabilityReady) {
      setFormError("Please wait while we check live availability for every selected house.");
      return;
    }
    if (!allSelectedAvailable) {
      setFormError("One or more selected houses are unavailable for their chosen dates. Choose another date range.");
      return;
    }
    if (!directBookingEnabled) {
      setFormError("This house combination requires a corporate enquiry before it can be booked.");
      return;
    }
    if (formData.purpose === "Other" && !formData.purposeOther.trim()) {
      setFormError("Tell us the purpose of your stay when choosing Other.");
      document.getElementById("corp-purpose-other")?.focus();
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        ...formData,
        houses: selectedProperties.map((property) => ({ propertySlug: property.slug, checkIn: stayFor(property).arrival, checkout: stayFor(property).departure, guestCount: stayFor(property).guests })),
      };
      const fingerprint = JSON.stringify(payload);
      const key = submission.current?.fingerprint === fingerprint ? submission.current.key : crypto.randomUUID();
      submission.current = { fingerprint, key };
      const response = await fetch("/api/corporate-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start secure checkout.");
      if (typeof result.checkoutUrl !== "string" || !result.checkoutUrl.startsWith("https://checkout.stripe.com/")) throw new Error("Secure checkout is unavailable. Please try again.");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not reserve the corporate booking.");
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
    const phone = enquiryData.phone ? normalizeAustralianMobile(enquiryData.phone) : "";
    if (enquiryData.phone && !phone) {
      setEnquiryError("Enter 9 digits starting with 4 after +61, or leave the phone number blank.");
      document.getElementById("corp-enquiry-phone")?.focus();
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
          phone,
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
    [copy.corporateFaq1Question, copy.corporateFaq1Answer],
    [copy.corporateFaq2Question, copy.corporateFaq2Answer],
    [copy.corporateFaq3Question, copy.corporateFaq3Answer],
    [copy.corporateFaq4Question, copy.corporateFaq4Answer],
    [copy.corporateFaq5Question, copy.corporateFaq5Answer],
    [copy.corporateFaq6Question, copy.corporateFaq6Answer],
    [copy.corporateFaq7Question, copy.corporateFaq7Answer],
    [copy.corporateFaq8Question, copy.corporateFaq8Answer],
    [copy.corporateFaq9Question, copy.corporateFaq9Answer],
  ];

  const combinedGuestCapacity = properties.reduce((total, property) => total + property.maxGuests, 0);

  return (
    <main className="corporate-stays-page corporate-editorial-page homepage-theme">
      <section className="corporate-editorial-hero" aria-labelledby="corporate-hero-title">
        <div className="corporate-editorial-hero__copy">
          <h1 id="corporate-hero-title">{copy.corporateHeroTitle} <span>{copy.corporateHeroAccent}</span></h1>
          <p>{copy.corporateHeroLead}</p>
          <div className="corporate-editorial-links">
            <Link className="corporate-editorial-links__primary" href="#corporate-booking"><BriefcaseBusiness size={19} aria-hidden="true" /><span>Book with Partner ID</span><ArrowUpRight size={18} aria-hidden="true" /></Link>
            <Link className="corporate-editorial-links__secondary" href="#corporate-question" onClick={() => openEnquiryType("insurance")}><ShieldCheck size={19} aria-hidden="true" /><span>Request insurance quote</span><ArrowUpRight size={18} aria-hidden="true" /></Link>
            <Link className="corporate-editorial-links__text" href="#corporate-question" onClick={() => openEnquiryType("corporate")}>Questions about corporate bookings? <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="corporate-editorial-hero__image">
          <Image src={media.corporateHero.src} alt={media.corporateHero.alt} fill priority sizes="(max-width: 760px) 100vw, 52vw" />
          {media.corporateHero.src === PUBLIC_PAGE_MEDIA.corporateHero.src && <span className="corporate-editorial-hero__image-note illustrative-photo-label">Illustrative image</span>}
        </div>
      </section>

      <section id="insurance-accommodation" className="corporate-insurance" aria-labelledby="corporate-insurance-title">
        <div className="corporate-insurance__heading">
          <span>Flexible accommodation, personally arranged</span>
          <h2 id="corporate-insurance-title">{copy.corporateIntroTitle}</h2>
          <p>{copy.corporateIntroLead}</p>
        </div>
        <div className="corporate-insurance__paths">
          <article className="corporate-insurance__path corporate-insurance__path--insurance">
            <div className="corporate-insurance__path-media">
              <Image src={media.corporateInsurance.src} alt={media.corporateInsurance.alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
              {media.corporateInsurance.src === PUBLIC_PAGE_MEDIA.corporateInsurance.src && <span className="corporate-insurance__image-note illustrative-photo-label">Illustrative image</span>}
            </div>
            <div className="corporate-insurance__path-content">
              <span className="corporate-insurance__number"><ShieldCheck size={18} aria-hidden="true" /> 01 / Insurance accommodation</span>
              <h3>{copy.corporateInsuranceTitle}</h3>
              <p>{copy.corporateInsuranceLead}</p>
              <ul>
                <li>{copy.corporateInsurancePoint1}</li>
                <li>{copy.corporateInsurancePoint2}</li>
                <li>{copy.corporateInsurancePoint3}</li>
                <li>{copy.corporateInsurancePoint4}</li>
                <li>{copy.corporateInsurancePoint5}</li>
              </ul>
              <Link href="#corporate-question" onClick={() => openEnquiryType("insurance")}>Request an insurance quote <ArrowUpRight size={19} aria-hidden="true" /></Link>
            </div>
          </article>
          <article className="corporate-insurance__path corporate-insurance__path--corporate">
            <div className="corporate-insurance__path-media">
              <Image src={media.corporateWork.src} alt={media.corporateWork.alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
              {media.corporateWork.src === PUBLIC_PAGE_MEDIA.corporateWork.src && <span className="corporate-insurance__image-note illustrative-photo-label">Illustrative image</span>}
            </div>
            <div className="corporate-insurance__path-content">
              <span className="corporate-insurance__number"><BriefcaseBusiness size={18} aria-hidden="true" /> 02 / Corporate bookings</span>
              <h3>{copy.corporateWorkTitle}</h3>
              <p>{copy.corporateWorkLead}</p>
              <ul>
                <li>{copy.corporateWorkPoint1}</li>
                <li>{copy.corporateWorkPoint2}</li>
                {properties.length > 0 && <li>{properties.length} furnished homes with capacity for up to {combinedGuestCapacity} guests in total</li>}
                <li>{copy.corporateWorkPoint3}</li>
                <li>{copy.corporateWorkPoint4}</li>
              </ul>
              <Link href="#corporate-question" onClick={() => openEnquiryType("corporate")}>Ask about corporate bookings <ArrowUpRight size={19} aria-hidden="true" /></Link>
            </div>
          </article>
        </div>
        <section className="corporate-coordinators" aria-labelledby="corporate-coordinators-title">
          <h2 id="corporate-coordinators-title">{copy.corporateCoordinatorsTitle}</h2>
          <ul className="corporate-coordinators__grid">
            <li><FileText size={32} strokeWidth={1.7} aria-hidden="true" /><span>{copy.corporateCoordinator1}</span></li>
            <li><FileText size={32} strokeWidth={1.7} aria-hidden="true" /><span>{copy.corporateCoordinator2}</span></li>
            <li><CreditCard size={32} strokeWidth={1.7} aria-hidden="true" /><span>{copy.corporateCoordinator3}</span></li>
            <li><CalendarDays size={32} strokeWidth={1.7} aria-hidden="true" /><span>{copy.corporateCoordinator4}</span></li>
          </ul>
        </section>
        <div className="corporate-insurance__homes">
          <div className="corporate-insurance__homes-heading">
            <h3>{copy.corporateHomesTitle}</h3>
            <p>{copy.corporateHomesLead}</p>
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
                  <span className="corporate-insurance__home-action">View house &amp; bed layout <ArrowUpRight size={17} aria-hidden="true" /></span>
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
            <h2 id="corporate-stay-features-title">{copy.corporateFeaturesTitle}</h2>
          </div>
          {corporateStayFeatures.map((feature, index) => (
            <article className="corporate-stay-features__item" key={index}>
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
              <h2>{enquiryType === "insurance" ? "Request a place to stay." : "Ask about corporate bookings."}</h2>
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
                      <button type="button" aria-pressed={enquiryType === "corporate"} onClick={() => selectEnquiryType("corporate")}>Corporate bookings</button>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormInput id="corp-enquiry-company" label={enquiryType === "insurance" ? "Insurer / organisation (optional)" : "Company name *"} required={enquiryType === "corporate"} value={enquiryData.companyName} onChange={(event) => setEnquiryData({ ...enquiryData, companyName: event.target.value })} placeholder={enquiryType === "insurance" ? "If applicable" : "Your company"} />
                      <FormInput id="corp-enquiry-contact" label="Contact name *" required value={enquiryData.contactName} onChange={(event) => setEnquiryData({ ...enquiryData, contactName: event.target.value })} placeholder="Full name" />
                      <FormInput id="corp-enquiry-email" label={enquiryType === "insurance" ? "Email address *" : "Business email *"} type="email" required value={enquiryData.email} onChange={(event) => setEnquiryData({ ...enquiryData, email: event.target.value })} placeholder={enquiryType === "insurance" ? "you@example.com" : "name@company.com.au"} />
                      <label htmlFor="corp-enquiry-phone">
                        Australian mobile number (optional)
                        <span className="corporate-enquiry-phone">
                          <span className="corporate-enquiry-phone__prefix" aria-hidden="true">+61</span>
                          <input id="corp-enquiry-phone" className="field" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="4XX XXX XXX" value={formatAustralianMobileLocal(enquiryData.phone)} onChange={(event) => setEnquiryData({ ...enquiryData, phone: australianMobileLocalDigits(event.target.value) })} />
                        </span>
                      </label>
                    </div>
                    {enquiryType === "insurance" && (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FormInput id="insurance-dates" label="Preferred dates (optional)" value={enquiryData.preferredDates} onChange={(event) => setEnquiryData({ ...enquiryData, preferredDates: event.target.value })} placeholder="Approximate dates are fine" />
                        <FormInput id="insurance-needs" label="People / bedrooms needed (optional)" value={enquiryData.accommodationNeeds} onChange={(event) => setEnquiryData({ ...enquiryData, accommodationNeeds: event.target.value })} placeholder="e.g. 4 people, 3 bedrooms" />
                      </div>
                    )}
                    <TextArea id="corp-enquiry-question" label={enquiryType === "insurance" ? "Accommodation needs *" : "Your question *"} required value={enquiryData.question} onChange={(event) => setEnquiryData({ ...enquiryData, question: event.target.value })} placeholder={enquiryType === "insurance" ? "Tell us what kind of home you need. You don’t need to share private claim details." : "What would you like to know about corporate bookings?"} rows={4} />
                    {enquiryError && <p className="border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700" role="alert" aria-live="polite">{enquiryError}</p>}
                    <button type="submit" className="inline-flex w-full items-center justify-center gap-2 bg-[var(--hero-green)] text-white px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-60" disabled={enquirySubmitting}>{enquirySubmitting ? "Sending enquiry…" : enquiryType === "insurance" ? "Request accommodation quote" : "Send corporate question"}<ArrowUpRight size={15} /></button>
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
              <li><span>02</span> Select houses</li>
              <li><span>03</span> Set dates and guests</li>
              <li><span>04</span> Secure payment</li>
            </ol>
          </div>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-32">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black block mb-4">Partner booking</span>
              <h2>Plan your corporate booking.</h2>
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
                    <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-3">
                      <h4 className="text-xl text-stone-900">2. Select houses</h4>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black">{selectedProperties.length} selected</span>
                    </div>
                    <p className="text-sm text-stone-600">Choose one house or as many as your team needs. Each house can have different dates and guests.</p>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mt-4">
                      {properties.map((property) => {
                        const checked = formData.propertySlugs.includes(property.slug);
                        return (
                          <label key={property.slug} className={`corporate-house-choice relative flex flex-col overflow-hidden transition-all cursor-pointer ${checked ? "is-selected" : ""}`}>
                            <div className="relative aspect-[4/3] w-full bg-stone-200">
                              {property.featuredImage && <Image src={property.featuredImage} alt={property.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />}
                              <input type="checkbox" checked={checked} onChange={(event) => updateHouseSelection(property.slug, event.target.checked)} className="sr-only" aria-label={`Select ${property.name.replace(" - Whole", "")}`} />
                              <span className="corporate-house-choice__check" aria-hidden="true">{checked && <Check size={20} strokeWidth={3} />}</span>
                            </div>
                            <div className="corporate-house-choice-caption p-4 bg-white flex flex-col flex-1">
                              <span className="corporate-house-choice__title-row"><span className="font-bold text-sm text-stone-900">{property.name.replace(" - Whole", "")}</span>{checked && <span className="corporate-house-choice__selected">Selected</span>}</span>
                              <span className="text-xs text-neutral-600 mt-1">Up to {Math.min(property.maxGuests, property.maximumAdults)} guests</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-5 pt-4">
                    <h4 className="text-xl text-stone-900 border-b border-stone-200 pb-3">3. Dates and guests for each house</h4>
                    {selectedProperties.map((property) => {
                      const stay = stayFor(property);
                      const state = availability[property.slug];
                      const nights = nightsBetween(stay.arrival, stay.departure);
                      return <div key={property.slug} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2"><h5 className="font-semibold text-[#002844]">{property.name}</h5><span className={`text-xs font-semibold ${state === "available" ? "text-emerald-700" : state === "unavailable" ? "text-red-700" : "text-slate-600"}`}>{!stay.arrival || !stay.departure ? "Choose dates" : state === "available" ? "Available" : state === "unavailable" ? "Dates unavailable" : state === "error" ? "Could not check availability" : "Checking availability…"}</span></div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_10rem]">
                          <button type="button" className="field min-h-[4.55rem] bg-white text-left" onClick={() => openCalendar(property.slug)} aria-haspopup="dialog"><span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-600"><CalendarCheck size={14} /> Check-in *</span><strong className="mt-1.5 block text-sm font-semibold text-stone-900">{stay.arrival ? formatDateAu(stay.arrival) : "Add date"}</strong></button>
                          <button type="button" className="field min-h-[4.55rem] bg-white text-left" onClick={() => openCalendar(property.slug)} aria-haspopup="dialog"><span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-600"><CalendarCheck size={14} /> Checkout *</span><strong className="mt-1.5 block text-sm font-semibold text-stone-900">{stay.departure ? formatDateAu(stay.departure) : "Add date"}</strong></button>
                          <div><label className="label mb-1.5 block text-[11px] uppercase tracking-[0.1em] font-bold text-black" htmlFor={`corp-guests-${property.slug}`}>Guests *</label><select id={`corp-guests-${property.slug}`} className="field bg-white text-sm font-medium" value={stay.guests} onChange={(event) => updateHouseStay(property.slug, { guests: Number(event.target.value) })}>{Array.from({ length: Math.min(property.maxGuests, property.maximumAdults) - Math.max(1, property.minimumGuests) + 1 }, (_, index) => { const count = Math.max(1, property.minimumGuests) + index; return <option key={count} value={count}>{count} guest{count === 1 ? "" : "s"}</option>; })}</select></div>
                        </div>
                        {nights > 0 && <p className="mt-3 text-sm text-stone-600">{nights} night{nights === 1 ? "" : "s"} · {formatAud(calculatePrice(property, stay.arrival, stay.departure, { ...defaultGuests, adults: stay.guests }).total)}</p>}
                        {stay.arrival && stay.departure && <p className="mt-2 text-sm leading-relaxed text-[#002844]">{freeCancellationText(stay.arrival, property.freeCancellationDays, property.lateCancellationFee)} Contact Serenity to cancel.</p>}
                        {nights > 0 && nights < property.minimumCorporateStay && <p className="mt-2 text-sm text-red-700">Minimum stay for corporate bookings: {property.minimumCorporateStay} night{property.minimumCorporateStay === 1 ? "" : "s"}.</p>}
                        {state === "unavailable" && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-red-700"><p>{availabilityConflict[property.slug] ? `${formatDateAu(availabilityConflict[property.slug])} is booked or blocked.` : "These dates overlap a booking or blocked night."}</p><button type="button" className="font-bold underline underline-offset-2" onClick={() => openCalendar(property.slug)}>Change dates</button></div>}
                        {state === "error" && <p className="mt-2 text-sm font-medium text-red-700">We could not check live availability. Open the calendar to retry.</p>}
                      </div>;
                    })}
                    <Modal title="Choose stay dates" className="corporate-date-dialog" open={Boolean(calendarProperty)} onClose={() => setCalendarSlug(null)}>
                      {calendarProperty && <>
                        <div className="corporate-date-dialog__intro">
                          <p className="corporate-date-dialog__property">{calendarProperty.name.replace(/\s*-\s*Whole$/i, "")} <span>· Minimum {calendarProperty.minimumCorporateStay} night{calendarProperty.minimumCorporateStay === 1 ? "" : "s"}</span></p>
                          <div className="corporate-date-dialog__steps" aria-live="polite">
                            <div className={`corporate-date-dialog__step ${!stayFor(calendarProperty).arrival ? "is-current" : "is-complete"}`}><span>1 · Check-in</span><strong>{stayFor(calendarProperty).arrival ? formatDateAu(stayFor(calendarProperty).arrival) : "Select a date"}</strong></div>
                            <div className={`corporate-date-dialog__step ${stayFor(calendarProperty).arrival && !stayFor(calendarProperty).departure ? "is-current" : stayFor(calendarProperty).departure ? "is-complete" : ""}`}><span>2 · Checkout</span><strong>{stayFor(calendarProperty).departure ? formatDateAu(stayFor(calendarProperty).departure) : "Select a date"}</strong></div>
                          </div>
                          <p className="corporate-date-dialog__guidance" role="status">{!stayFor(calendarProperty).arrival ? "Choose the day your team arrives." : !stayFor(calendarProperty).departure ? "Now choose the day your team leaves." : "Dates selected. Choose a new check-in date to change them."}</p>
                        </div>
                        {calendarConflictDate && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{formatDateAu(calendarConflictDate)} is booked or blocked. Choose another date range.</p>}
                        {!calendarAvailability || calendarAvailability.slug !== calendarProperty.slug || calendarAvailability.status === "loading" ? <p className="corporate-date-dialog__guidance" role="status">Checking bookings and blocked dates for this house…</p> : calendarAvailability.status === "error" ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><p>Live availability could not be loaded. Please retry before choosing dates.</p><button type="button" className="corporate-date-dialog__clear" onClick={retryCalendar}>Retry availability</button></div> : <MiniCalendar key={`corporate-${calendarProperty.slug}-${calendarResetKey}`} property={calendarProperty} today={today} checkIn={stayFor(calendarProperty).arrival} checkout={stayFor(calendarProperty).departure} blockedDates={calendarAvailability.blockedDates} singleMonth showSelectionHeader={false} showHint={false} corporate onCheckInSelect={(arrival) => updateHouseStay(calendarProperty.slug, { arrival, departure: "" })} onSelect={(arrival, departure) => { updateHouseStay(calendarProperty.slug, { arrival, departure }); setFormError(""); setCalendarSlug(null); }} />}
                        {(stayFor(calendarProperty).arrival || stayFor(calendarProperty).departure) && <button type="button" className="corporate-date-dialog__clear" onClick={() => { updateHouseStay(calendarProperty.slug, { arrival: "", departure: "" }); setCalendarResetKey((value) => value + 1); }}>Clear dates</button>}
                      </>}
                    </Modal>
                    <div>
                      <label className="label mb-1.5 block text-[11px] uppercase tracking-[0.1em] font-bold text-black" htmlFor="corp-purpose">Stay purpose</label>
                      <select id="corp-purpose" className="field bg-white text-sm font-medium" value={formData.purpose} onChange={(event) => setFormData({ ...formData, purpose: event.target.value })}><option>Contractor project crew</option><option>Employee relocation</option><option>Business travel</option><option>Training or event</option><option>Other</option></select>
                      {formData.purpose === "Other" && <div className="mt-4"><label className="label mb-1.5 block text-[11px] uppercase tracking-[0.1em] font-bold text-black" htmlFor="corp-purpose-other">Tell us your stay purpose *</label><input id="corp-purpose-other" className="field bg-white text-sm font-medium" type="text" placeholder="Describe the purpose of your stay" value={formData.purposeOther} maxLength={160} required onChange={(event) => setFormData({ ...formData, purposeOther: event.target.value })} /></div>}
                    </div>
                    {datesReady && <div className={`mt-4 rounded-xl p-4 text-sm font-medium ${allSelectedAvailable ? "bg-[#e8eef2] text-[#002844] border border-[#b9cbd7]" : availabilityReady || availabilityFailed ? "bg-red-50 text-red-800 border border-red-200" : "bg-stone-50 text-stone-600 border border-stone-200"}`} aria-live="polite">{allSelectedAvailable ? "All selected houses are available for their chosen dates." : availabilityFailed ? "Live availability could not be checked. Open the house calendar to retry." : availabilityReady ? "One or more houses overlap a booking or blocked night. Choose different dates." : "Checking bookings, manual blocks, and connected calendars…"}</div>}
                    {allSelectedAvailable && (
                      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-stone-300 bg-white p-6 shadow-sm">
                        <div>
                          <p className="corporate-editorial-serif text-lg text-stone-900">Indicative estimate</p>
                          <p className="mt-1 text-sm text-stone-600">{selectedProperties.length} house{selectedProperties.length === 1 ? "" : "s"} · one payment</p>
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
                    <button type="submit" className="inline-flex w-full items-center justify-center gap-2 bg-[var(--hero-green)] text-white px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-60" disabled={formSubmitting || partnerChecking || !partnerCompany || !allSelectedAvailable || !directBookingEnabled}>
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
              <h2>{copy.corporateFaqTitle}</h2>
            </div>
            <div className="lg:col-span-8">
              <div className="serenity-editorial-faq__list" aria-label="Corporate booking frequently asked questions">
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
            <h2 className="max-w-3xl">{copy.corporateClosingTitle}</h2>
          </div>
          <div className="mt-10 max-w-sm lg:mt-0">
            <p className="text-base leading-relaxed text-white">{copy.corporateClosingLead}</p>
            <div className="mt-8 space-y-4 text-sm font-medium tracking-wide text-white">
              <p className="flex items-center gap-4"><Phone size={18} className="text-white" /> <a href={`tel:${contact.phoneNumber.replace(/[^+\d]/g, "")}`} className="hover:underline transition-colors">{contact.phoneNumber}</a></p>
              <p className="flex items-center gap-4"><Mail size={18} className="text-white" /> <a href={`mailto:${contact.contactEmail}`} className="break-words hover:underline transition-colors">{contact.contactEmail}</a></p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
