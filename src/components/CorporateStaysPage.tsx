"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  Car,
  CheckCircle2,
  ChevronDown,
  Home,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SerenityLocationMap } from "@/src/components/SerenityLocationMap";
import { MiniCalendar } from "@/src/components/BookingWidgets";
import ScrollWipeText from "@/src/components/homepage/ScrollWipeText";
import { FormInput, TextArea } from "@/src/components/UI";
import { useContactSettings } from "@/src/context/ContactSettingsContext";
import type { Property } from "@/src/data/properties";
import { calculatePrice, datesInRange, defaultGuests, formatAud, formatDateAu, nightsBetween } from "@/src/lib/booking";
import { DEFAULT_CONTACT_SETTINGS } from "@/src/lib/siteSettings";
import { canBookCorporateDirectly } from "@/src/lib/reservationRules";

type AvailabilityState = "checking" | "available" | "unavailable" | "error";

export function CorporateStaysPage({ today, properties }: { today: string; properties: Property[] }) {
  const contact = useContactSettings() ?? DEFAULT_CONTACT_SETTINGS;
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [submittedReference, setSubmittedReference] = useState("");
  const [availability, setAvailability] = useState<Record<string, AvailabilityState>>({});
  const [submissionKey, setSubmissionKey] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarResetKey, setCalendarResetKey] = useState(0);
  const corporateDatePickerRef = useRef<HTMLDivElement>(null);
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");
  const [enquiryReference, setEnquiryReference] = useState("");
  const [enquirySubmissionKey, setEnquirySubmissionKey] = useState("");
  const [enquiryData, setEnquiryData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    question: "",
  });
  const [formData, setFormData] = useState({
    customerId: "",
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    arrival: "",
    departure: "",
    guests: "4",
    housesNeeded: "1",
    propertySlugs: [properties[0]?.slug ?? "serenity-7"],
    abn: "",
    purchaseOrder: "",
    invoiceRequested: false,
    purpose: "Contractor project crew",
    notes: "",
  });

  const selectedProperties = properties.filter((property) => formData.propertySlugs.includes(property.slug));
  const corporateGuestCount = Number(formData.guests.split("-")[0]) || 1;
  const guestsPerHouse = { ...defaultGuests, adults: Math.max(1, Math.ceil(corporateGuestCount / Math.max(1, selectedProperties.length))) };
  const estimatedCorporateTotal = selectedProperties.reduce((total, property) => total + calculatePrice(property, formData.arrival, formData.departure, guestsPerHouse, true).total, 0);
  const corporateNights = nightsBetween(formData.arrival, formData.departure);
  const selectedDates = formData.arrival && formData.departure > formData.arrival ? datesInRange(formData.arrival, formData.departure) : [];
  const availabilityReady = selectedDates.length > 0 && selectedProperties.every((property) => Boolean(availability[property.slug]) && availability[property.slug] !== "checking");
  const allSelectedAvailable = availabilityReady && selectedProperties.every((property) => availability[property.slug] === "available");
  const directBookingEnabled = canBookCorporateDirectly(selectedProperties);
  const calendarProperty = selectedProperties[0] ?? properties[0];

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
      setFormError("Enter the corporate customer ID issued by Serenity.");
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
          guests: guestsPerHouse,
          idempotencyKey: key,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not reserve the corporate stay.");
      setSubmittedReference(String(result.booking?.reference ?? ""));
      setFormSubmitted(true);
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

  const handleEnquirySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEnquiryError("");
    if (!enquiryData.companyName.trim() || !enquiryData.contactName.trim() || !enquiryData.email.trim() || !enquiryData.question.trim()) {
      setEnquiryError("Complete your company, contact name, email, and question.");
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
          enquiryType: "corporate_question",
          companyName: enquiryData.companyName,
          contactName: enquiryData.contactName,
          email: enquiryData.email,
          phone: enquiryData.phone,
          purpose: "Corporate question",
          notes: enquiryData.question,
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
    ["Do you offer corporate accommodation in Pakenham?", "Yes. Serenity Stays provides direct accommodation in Pakenham for project teams, contractor crews, executive relocations, and extended business stays."],
    ["Can our company book multiple houses for work crews?", "Yes. Serenity 7, Serenity 9, and Serenity 11 sit beside each other, so companies can hold two or all three houses together."],
    ["Are the houses furnished with utilities and Wi-Fi included?", "Every house is turn-key furnished with Wi-Fi, electricity, gas, water, a full kitchen, laundry facilities, and linen included."],
    ["Do you support weekly and monthly stay pricing?", "Yes. Direct discounts are available for stays over 7 nights and monthly stays over 28 nights. The team will confirm the final rate in your enquiry."],
    ["Can our company request GST tax invoices and ABN billing?", "Yes. We can provide tax invoices with ABN details and support purchase order processing for company bookings."],
    ["Is parking available for work vans and utility trucks?", "Each house has off-street driveway parking plus street parking out front for commercial vehicles, utility trucks, and team cars."],
    ["Are pets allowed for relocating employees?", "Yes. All three Serenity properties welcome declared family pets and have enclosed yards."],
  ];

  return (
    <main className="corporate-stays-page bg-white text-[#2D2622]">
      <section className="bg-white py-20 lg:py-32">
        <div className="container max-w-[92rem] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6 flex flex-col items-start justify-center">
              <span className="font-marcellus italic text-xl md:text-2xl text-stone-800 mb-6 tracking-wide flex items-center gap-2"><MapPin size={18} /> Corporate accommodation · Pakenham</span>
              <ScrollWipeText as="h1" className="display-font mb-8 max-w-[12ch] text-[clamp(3.4rem,6vw,6rem)] font-bold leading-[0.9] tracking-[-0.045em] text-stone-900">Room for the workday. Privacy after it.</ScrollWipeText>
              <p className="text-lg md:text-xl font-medium text-stone-800 mb-6 leading-relaxed max-w-xl">Thoughtfully prepared private homes for project teams, contractors, relocating employees, and companies that need the comfort of home.</p>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link href="#corporate-question" className="inline-block bg-[#2D2622] text-white rounded-none px-8 py-4 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors shadow-lg">Ask about a corporate stay</Link>
                <Link href="#corporate-booking" className="inline-block border border-stone-300 bg-transparent text-stone-900 rounded-none px-8 py-4 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase hover:border-stone-900 transition-colors">Book as an existing customer</Link>
              </div>
            </div>

            <div className="lg:col-span-6 relative pt-12 lg:pt-0">
              <div className="relative aspect-[4/5] w-full max-w-lg mx-auto lg:mr-auto lg:ml-4 overflow-hidden rounded-none bg-[#DED2CB] shadow-xl">
                <Image src="/corp-1.png" alt="Serenity houses side by side in Pakenham" fill priority sizes="(max-width: 1023px) 100vw, 50vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/5" aria-hidden="true" />
                <div className="absolute inset-6 sm:inset-8 border border-white/60 pointer-events-none" aria-hidden="true" />
                <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 right-6 sm:right-8 border-t border-white/70 pt-5 pb-6 px-1 sm:px-3 text-white text-left pointer-events-none">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em]">Serenity Stays</p>
                  <p className="mt-2 font-marcellus text-[1.65rem] sm:text-4xl leading-tight">Space to settle in.</p>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-2 sm:-right-4 lg:-bottom-12 lg:-right-6 z-10 w-[min(18rem,75%)] bg-white p-3 shadow-2xl">
                <div className="relative aspect-square overflow-hidden bg-[#DED2CB]">
                  <Image src="/corp-2.png" alt="Furnished kitchen and living area inside a Serenity house" fill sizes="(max-width: 639px) 75vw, 18rem" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" aria-hidden="true" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white pointer-events-none">
                    <p className="font-marcellus text-xl sm:text-[1.35rem] leading-[1.25]">Private homes, thoughtfully prepared.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-24 border-b border-stone-200">
        <div className="container max-w-[92rem] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-4">
            <div className="lg:col-span-1 border-b border-stone-200 lg:border-none pb-6 lg:pb-0">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-stone-500 block mb-3">Why Serenity</span>
              <ScrollWipeText as="h2" className="display-font text-3xl sm:text-4xl leading-tight font-bold text-stone-900">A simpler way to house a team.</ScrollWipeText>
            </div>
            <div className="lg:col-span-3 grid gap-10 sm:grid-cols-3">
              {[
                [Home, "Private homes", "Whole-house privacy, living areas, furnished kitchens, and enclosed yards for space to decompress."],
                [Users, "Keep teams close", "Book adjacent houses so everyone stays nearby without sharing one crowded space."],
                [Receipt, "Company-ready", "Direct pricing, tax invoices, ABN billing, and purchase order support for easy administration."],
              ].map(([Icon, title, description]) => (
                <article key={title as string} className="flex flex-col">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center bg-white rounded-none border border-stone-200">
                    <Icon size={20} className="text-[#85644E]" />
                  </div>
                  <h3 className="font-marcellus text-xl text-stone-900 mb-3">{title as string}</h3>
                  <p className="text-sm leading-relaxed text-stone-600">{description as string}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="corporate-question" className="bg-white py-20 sm:py-28">
        <div className="container max-w-[92rem] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5 flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#85644E] block mb-4">Enquiry</span>
              <ScrollWipeText as="h2" className="display-font text-4xl sm:text-5xl font-bold text-stone-900 mb-6">Ask about a corporate stay.</ScrollWipeText>
              <p className="text-base text-stone-600 leading-relaxed max-w-md mb-8">Use this short enquiry form for rates, invoices, longer stays, team arrangements, or anything you want to clarify before booking.</p>
              <ul className="space-y-4 text-sm text-stone-600">
                <li className="flex items-start gap-3"><CalendarCheck size={18} className="text-[#85644E] shrink-0 mt-0.5" /> Weekly and monthly stays welcome</li>
                <li className="flex items-start gap-3"><ShieldCheck size={18} className="text-[#85644E] shrink-0 mt-0.5" /> Exact details confirmed before arrival</li>
                <li className="flex items-start gap-3"><Car size={18} className="text-[#85644E] shrink-0 mt-0.5" /> Parking for team vehicles</li>
              </ul>
            </div>
            
            <div className="lg:col-span-7">
              <div className="bg-white p-6 sm:p-10 border border-stone-200 shadow-sm">
                {enquirySubmitted ? (
                  <div className="py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center bg-[#2D2622] text-white"><CheckCircle2 size={24} /></div>
                    <h4 className="mt-5 text-xl font-semibold">Your question has been sent.</h4>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#685B53]">Thank you, {enquiryData.contactName || "we've received your enquiry"}. The Serenity team will reply to your business email.</p>
                    {enquiryReference && <p className="mt-4 inline-block border-y border-[#D8CCC4] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#85644E]">Reference {enquiryReference}</p>}
                    <div><button type="button" className="mt-6 border border-[#2D2622] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] hover:bg-[#2D2622] hover:text-white" onClick={() => { setEnquirySubmitted(false); setEnquirySubmissionKey(""); setEnquiryReference(""); setEnquiryData({ companyName: "", contactName: "", email: "", phone: "", question: "" }); }}>Ask another question</button></div>
                  </div>
                ) : (
                  <form onSubmit={handleEnquirySubmit} className="mt-6 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormInput id="corp-enquiry-company" label="Company name *" required value={enquiryData.companyName} onChange={(event) => setEnquiryData({ ...enquiryData, companyName: event.target.value })} placeholder="Your company" />
                      <FormInput id="corp-enquiry-contact" label="Contact name *" required value={enquiryData.contactName} onChange={(event) => setEnquiryData({ ...enquiryData, contactName: event.target.value })} placeholder="Full name" />
                      <FormInput id="corp-enquiry-email" label="Business email *" type="email" required value={enquiryData.email} onChange={(event) => setEnquiryData({ ...enquiryData, email: event.target.value })} placeholder="name@company.com.au" />
                      <FormInput id="corp-enquiry-phone" label="Phone number (optional)" type="tel" value={enquiryData.phone} onChange={(event) => setEnquiryData({ ...enquiryData, phone: event.target.value })} placeholder="+61 400 000 000" />
                    </div>
                    <TextArea id="corp-enquiry-question" label="Your question *" required value={enquiryData.question} onChange={(event) => setEnquiryData({ ...enquiryData, question: event.target.value })} placeholder="What would you like to know about a corporate stay?" rows={4} />
                    {enquiryError && <p className="border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700" role="alert" aria-live="polite">{enquiryError}</p>}
                    <button type="submit" className="inline-flex w-full items-center justify-center gap-2 bg-[#2D2622] text-white px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] rounded-none hover:bg-stone-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60" disabled={enquirySubmitting}>{enquirySubmitting ? "Sending question…" : "Send corporate question"}<ArrowUpRight size={15} /></button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="corporate-booking" className="bg-white py-20 sm:py-28 border-y border-[#DED5CD]">
        <div className="container max-w-[92rem] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-32">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#85644E] block mb-4">Existing Customers</span>
              <ScrollWipeText as="h2" className="display-font text-4xl sm:text-5xl font-bold text-stone-900 mb-6">Book with your customer ID.</ScrollWipeText>
              <p className="text-base text-stone-600 leading-relaxed mb-6 max-w-md">Use this booking form to secure your stay dates instantly if Serenity has already issued your company a corporate customer ID.</p>
            </div>
            
            <div className="lg:col-span-8">
              <div className="bg-white p-6 sm:p-10 border border-[#DED5CD] shadow-sm">
              {formSubmitted ? (
                  <div className="flex min-h-[30rem] flex-col items-center justify-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-none bg-[#2D2622] text-white"><CheckCircle2 size={27} /></div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Corporate stay reserved.</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#685B53]">Thank you, {formData.companyName || "your team"}. The selected houses are now held together in the shared Serenity calendar.</p>
                  {submittedReference && <p className="mt-4 border-y border-[#D8CCC4] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#85644E]">Reference {submittedReference}</p>}
                  <button type="button" className="mt-7 border border-[#2D2622] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] hover:bg-[#2D2622] hover:text-white" onClick={() => { setFormSubmitted(false); setSubmissionKey(""); setSubmittedReference(""); }}>Book another stay</button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="mt-8 space-y-8">
                  <div className="space-y-5">
                    <h4 className="font-marcellus text-xl text-stone-900 border-b border-stone-200 pb-3">1. Company Details</h4>
                    <div className="bg-white p-5 border border-stone-200">
                      <FormInput id="corp-customer-id" label="Corporate customer ID *" required maxLength={80} value={formData.customerId} onChange={(event) => setFormData({ ...formData, customerId: event.target.value.toUpperCase() })} placeholder="Enter the ID issued by Serenity" />
                      <p className="mt-2 text-xs leading-5 text-stone-600">This ID is required for existing corporate customers and is stored with the reservation.</p>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormInput id="corp-company-name" label="Company name *" required value={formData.companyName} onChange={(event) => setFormData({ ...formData, companyName: event.target.value })} placeholder="e.g. Cardinia Infrastructure Group" />
                      <FormInput id="corp-contact-name" label="Contact name *" required value={formData.contactName} onChange={(event) => setFormData({ ...formData, contactName: event.target.value })} placeholder="Full name" />
                      <FormInput id="corp-email" label="Business email *" type="email" required value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} placeholder="corporate@company.com.au" />
                      <FormInput id="corp-phone" label="Phone number *" type="tel" required value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} placeholder="+61 400 000 000" />
                    </div>
                  </div>

                  <div className="space-y-5 pt-4">
                    <h4 className="font-marcellus text-xl text-stone-900 border-b border-stone-200 pb-3">2. Stay Dates & Team</h4>
                    <div ref={corporateDatePickerRef} className={`relative ${calendarOpen ? "z-30" : "z-0"}`}>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <button
                          type="button"
                          className={`field min-h-[4.55rem] text-left ${calendarOpen ? "border-stone-900 bg-white ring-1 ring-stone-900" : "bg-white hover:border-stone-400"}`}
                          onClick={() => setCalendarOpen(true)}
                          aria-expanded={calendarOpen}
                          aria-controls="corporate-date-calendar"
                        >
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500"><CalendarCheck size={14} /> Expected arrival *</span>
                          <strong className="mt-1.5 block text-sm font-semibold text-stone-900">{formData.arrival ? formatDateAu(formData.arrival) : "Add date"}</strong>
                        </button>
                        <button
                          type="button"
                          className={`field min-h-[4.55rem] text-left ${calendarOpen ? "border-stone-900 bg-white ring-1 ring-stone-900" : "bg-white hover:border-stone-400"}`}
                          onClick={() => setCalendarOpen(true)}
                          aria-expanded={calendarOpen}
                          aria-controls="corporate-date-calendar"
                        >
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500"><CalendarCheck size={14} /> Expected departure *</span>
                          <strong className="mt-1.5 block text-sm font-semibold text-stone-900">{formData.departure ? formatDateAu(formData.departure) : "Add date"}</strong>
                        </button>
                      </div>

                      {calendarOpen && calendarProperty && (
                        <div id="corporate-date-calendar" className="corporate-calendar-popover absolute left-0 top-[calc(100%+0.75rem)] z-50 w-full max-w-[44rem] sm:left-auto sm:right-0" role="dialog" aria-label="Select corporate stay dates">
                          <div className="booking-calendar-popover-header">
                            <div>
                              <h3 className="text-lg font-bold text-stone-900">Select check-in &amp; checkout dates</h3>
                              <p className="mt-1 text-sm text-stone-500">Choose the dates for your team stay.</p>
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
                      <div><label className="label mb-1.5 block text-[11px] uppercase tracking-[0.1em] font-bold text-stone-700" htmlFor="corp-guests">Guests / employees *</label><select id="corp-guests" className="field bg-white text-sm font-medium" value={formData.guests} onChange={(event) => setFormData({ ...formData, guests: event.target.value })}><option value="1-3">1 - 3 guests</option><option value="4-7">4 - 7 guests</option><option value="8-14">8 - 14 guests</option><option value="15-21">15 - 21 guests</option></select></div>
                      <div><label className="label mb-1.5 block text-[11px] uppercase tracking-[0.1em] font-bold text-stone-700" htmlFor="corp-houses">Houses needed *</label><select id="corp-houses" className="field bg-white text-sm font-medium" value={formData.housesNeeded} onChange={(event) => updateHouseCount(event.target.value)}><option value="1">1 house</option><option value="2">2 houses beside each other</option><option value="3">All 3 houses beside each other</option></select></div>
                      <div><label className="label mb-1.5 block text-[11px] uppercase tracking-[0.1em] font-bold text-stone-700" htmlFor="corp-purpose">Stay purpose</label><select id="corp-purpose" className="field bg-white text-sm font-medium" value={formData.purpose} onChange={(event) => setFormData({ ...formData, purpose: event.target.value })}><option>Contractor project crew</option><option>Employee relocation</option><option>Business travel</option><option>Training or event</option><option>Other</option></select></div>
                    </div>
                  </div>

                  <div className="space-y-5 pt-4">
                    <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-3">
                      <h4 className="font-marcellus text-xl text-stone-900">3. Select Adjacent Houses</h4>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#85644E]">{selectedProperties.length} selected</span>
                    </div>
                    <p className="text-sm text-stone-600">The required house count updates automatically as you select properties.</p>
                    <div className="grid gap-4 sm:grid-cols-3 mt-4">
                      {properties.map((property) => {
                        const checked = formData.propertySlugs.includes(property.slug);
                        const state = availability[property.slug];
                        const unavailable = selectedDates.length > 0 && state === "unavailable";
                        const disabled = !checked && unavailable;
                        return (
                          <label key={property.slug} className={`relative flex flex-col overflow-hidden border transition-all ${disabled ? "cursor-not-allowed border-stone-200 bg-stone-50 opacity-60" : checked ? "cursor-pointer border-stone-900 shadow-md ring-1 ring-stone-900" : "cursor-pointer border-stone-300 bg-white hover:border-stone-400"}`}>
                            <div className="relative aspect-[4/3] w-full bg-stone-200">
                              {property.featuredImage && <Image src={property.featuredImage} alt={property.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />
                              <div className="absolute top-3 left-3 bg-white p-1 shadow-sm">
                                <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => updateHouseSelection(property.slug, event.target.checked)} className="h-4 w-4 accent-stone-900 block" />
                              </div>
                            </div>
                            <div className="p-4 bg-white flex flex-col flex-1">
                              <span className="font-bold text-sm text-stone-900">{property.name.replace(" - Whole", "")}</span>
                              <span className="text-xs text-stone-500 mt-1">Beside other houses</span>
                              {selectedDates.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                                  <span className={`text-[10px] uppercase tracking-[0.15em] font-bold ${state === "available" ? "text-emerald-700" : state === "unavailable" ? "text-red-700" : "text-stone-500"}`}>{state === "available" ? "Available" : state === "unavailable" ? "Unavailable" : state === "error" ? "Retry" : "Checking..."}</span>
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {selectedDates.length > 0 && <div className={`mt-4 p-4 text-sm font-medium ${allSelectedAvailable ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : availabilityReady ? "bg-red-50 text-red-800 border border-red-200" : "bg-stone-50 text-stone-600 border border-stone-200"}`} aria-live="polite">{allSelectedAvailable ? "All selected houses are available in the shared Serenity calendar." : availabilityReady ? "At least one selected house is unavailable. Choose another house or date range." : "Checking bookings, manual blocks, and connected calendars…"}</div>}
                    
                    {corporateNights > 0 && selectedProperties.length > 0 && (
                      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-stone-300 bg-white p-6 shadow-sm">
                        <div>
                          <p className="font-marcellus text-lg text-stone-900">Indicative estimate</p>
                          <p className="mt-1 text-sm text-stone-600">{selectedProperties.length} house{selectedProperties.length === 1 ? "" : "s"} · {corporateNights} night{corporateNights === 1 ? "" : "s"}</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-stone-900">{formatAud(estimatedCorporateTotal)} AUD</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 pt-4">
                    <h4 className="font-marcellus text-xl text-stone-900 border-b border-stone-200 pb-3">4. Billing & Requirements</h4>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormInput id="corp-abn" label="ABN (optional)" value={formData.abn} onChange={(event) => setFormData({ ...formData, abn: event.target.value })} placeholder="12 345 678 901" />
                      <FormInput id="corp-po" label="Purchase order (optional)" value={formData.purchaseOrder} onChange={(event) => setFormData({ ...formData, purchaseOrder: event.target.value })} placeholder="PO or cost centre" />
                    </div>
                    <label className="flex items-start gap-3 border border-stone-200 bg-white p-5 text-sm font-medium cursor-pointer hover:bg-stone-50 transition-colors">
                      <input type="checkbox" checked={formData.invoiceRequested} onChange={(event) => setFormData({ ...formData, invoiceRequested: event.target.checked })} className="mt-0.5 h-4 w-4 accent-stone-900" />
                      <span>Request a GST tax invoice with ABN and purchase order details.</span>
                    </label>
                    <TextArea id="corp-notes" label="Notes or requirements" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} placeholder="Tell us about roster flexibility, parking, billing, or anything else your team needs..." rows={4} />
                  </div>

                  <div className="pt-4 border-t border-stone-200">
                    {formError && <p className="mb-5 border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800" role="alert" aria-live="polite">{formError}</p>}
                    <button type="submit" className="inline-flex w-full items-center justify-center gap-2 bg-[#2D2622] text-white px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] rounded-none hover:bg-stone-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60" disabled={formSubmitting || !allSelectedAvailable || !directBookingEnabled}>
                      {formSubmitting ? "Reserving…" : directBookingEnabled ? "Book corporate stay" : "Enquiry required"}<ArrowUpRight size={15} />
                    </button>
                    {!directBookingEnabled && selectedProperties.length > 0 && <p className="mt-4 text-xs leading-relaxed text-stone-600">The selected house rules require review before confirmation. Use the separate corporate enquiry form above and the Serenity team can help.</p>}
                  </div>
                </form>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <div className="container max-w-[92rem] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block mb-4">Before your stay</span>
              <ScrollWipeText as="h2" className="display-font text-4xl sm:text-5xl font-bold text-stone-900">Clear answers before arrival.</ScrollWipeText>
            </div>
            <div className="lg:col-span-8">
              <div className="border-t border-[#DED2CB]">
                {corporateFaqs.map(([question, answer]) => (
                  <details key={question} className="group border-b border-[#DED2CB] py-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-marcellus text-stone-900 marker:hidden">
                      <span>{question}</span>
                      <ChevronDown size={20} className="shrink-0 text-stone-400 transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <p className="max-w-2xl pr-8 pt-4 text-sm leading-relaxed text-stone-600">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28 border-y border-stone-200">
        <div className="container max-w-[92rem] px-5 sm:px-8 lg:px-12">
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#85644E] block mb-4">The setting</span>
              <ScrollWipeText as="h2" className="display-font text-4xl sm:text-5xl font-bold text-stone-900">The comfort of home in Pakenham.</ScrollWipeText>
            </div>
            <Link href="/contact" className="inline-flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-stone-500 hover:text-stone-900 transition-colors border-b border-stone-300 hover:border-stone-900 pb-1">Discover the setting</Link>
          </div>
          <div className="corporate-location-map-frame h-[26rem] sm:h-[34rem]"><SerenityLocationMap /></div>
        </div>
      </section>

      <section className="bg-white text-[#2D2622]">
        <div className="container max-w-[92rem] px-5 py-20 sm:px-8 sm:py-28 lg:flex lg:items-end lg:justify-between lg:gap-16 lg:px-12">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#CDBBAA] block mb-6">Personalised guest support</span>
            <ScrollWipeText as="h2" className="display-font max-w-3xl text-4xl sm:text-5xl lg:text-6xl leading-tight font-bold text-[#2D2622]">A comfortable home for the people doing the work.</ScrollWipeText>
          </div>
          <div className="mt-10 max-w-sm lg:mt-0">
            <p className="text-base leading-relaxed text-[#6F5A4D]">We&apos;re here to make company stays simple, from the first enquiry to the final invoice.</p>
            <div className="mt-8 space-y-4 text-sm font-medium tracking-wide text-[#2D2622]">
              <p className="flex items-center gap-4"><Phone size={18} className="text-[#85644E]" /> <a href={`tel:${contact.phoneNumber.replace(/[^+\d]/g, "")}`} className="hover:text-[#85644E] transition-colors">{contact.phoneNumber}</a></p>
              <p className="flex items-center gap-4"><Mail size={18} className="text-[#85644E]" /> <a href={`mailto:${contact.corporateEnquiryEmail}`} className="break-words hover:text-[#85644E] transition-colors">{contact.corporateEnquiryEmail}</a></p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
