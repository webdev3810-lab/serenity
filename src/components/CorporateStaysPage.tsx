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
import { ApproximateMap } from "@/src/components/ApproximateMap";
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
    <main className="bg-[#F8F6F2] text-[#2D2622]">
      <section className="border-b border-[#DED5CD]">
        <div className="container max-w-[92rem] px-5 pb-14 pt-20 sm:px-8 sm:pb-20 sm:pt-28 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
            <div className="lg:col-span-5">
              <p className="eyebrow mb-5 flex items-center gap-2 text-[#85644E]"><MapPin size={14} /> Corporate accommodation · Pakenham</p>
              <ScrollWipeText as="h1" className="text-[clamp(3.3rem,7vw,7.5rem)] font-semibold leading-[0.87] tracking-[-0.07em]" revealClassName="text-[#2D2622]">Room for the workday. Privacy after it.</ScrollWipeText>
              <p className="mt-8 max-w-md text-base leading-7 text-[#685B53]">Fully furnished private houses for project teams, contractors, relocating employees, and companies that need a calm base.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="#corporate-question" className="inline-flex items-center gap-2 bg-[#2D2622] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-[#85644E]">Ask a question <ArrowUpRight size={15} /></Link>
                <Link href="#corporate-booking" className="inline-flex items-center gap-2 border border-[#B9A697] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] hover:border-[#2D2622]">Book as a customer <ArrowUpRight size={15} /></Link>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative aspect-[1.2] overflow-hidden bg-[#E6DDD5]">
                {properties[1]?.featuredImage ? <Image src={properties[1].featuredImage} alt="Serenity furnished house for corporate stays" fill priority sizes="(max-width: 1023px) 100vw, 58vw" className="object-cover" /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[#191512]/65 via-transparent to-transparent" aria-hidden="true" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white sm:bottom-7 sm:left-7 sm:right-7">
                  <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E5D6C8]">A practical base</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Three homes, side by side.</p></div>
                  <span className="text-xs font-bold uppercase tracking-[0.16em]">Pakenham VIC</span>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 border-y border-[#DED5CD] py-4 text-xs font-bold uppercase tracking-[0.13em] text-[#85644E]">
                <span>3 homes</span><span>Up to 21 guests</span><span>Whole-house stays</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#DED5CD] bg-[#EEE8E1]">
        <div className="container max-w-[92rem] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="eyebrow text-[#85644E]">Why Serenity</p>
              <ScrollWipeText as="h2" className="mt-3 max-w-xl text-4xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-6xl" revealClassName="text-[#2D2622]">A simpler way to house a team.</ScrollWipeText>
            </div>
            <div className="grid gap-8 sm:grid-cols-3 lg:col-span-7">
              {[
                [Home, "Private homes", "Whole-house privacy, living areas, kitchens, and enclosed yards."],
                [Users, "Keep teams close", "Book adjacent houses so everyone stays nearby without sharing one crowded space."],
                [Receipt, "Company-ready", "Direct pricing, tax invoices, ABN billing, and purchase order support."],
              ].map(([Icon, title, description]) => (
                <article key={title as string} className="border-t border-[#B9A697] pt-4">
                  <Icon size={21} className="text-[#85644E]" />
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em]">{title as string}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#685B53]">{description as string}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="corporate-enquiry" className="border-y border-[#DED5CD] bg-[#EEE8E1]">
        <div className="container max-w-[92rem] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <p className="eyebrow text-[#85644E]">Corporate support</p>
              <ScrollWipeText as="h2" className="mt-3 text-4xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-6xl" revealClassName="text-[#2D2622]">Ask first or book directly.</ScrollWipeText>
              <p className="mt-6 max-w-sm text-sm leading-6 text-[#685B53]">Choose the short enquiry when you only have a question. Existing corporate customers can use the separate booking form with their customer ID.</p>
              <div className="mt-8 space-y-3 text-sm text-[#685B53]">
                <p className="flex items-center gap-2"><CalendarCheck size={16} className="text-[#85644E]" /> Weekly and monthly stays welcome</p>
                <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#85644E]" /> Exact details confirmed before arrival</p>
                <p className="flex items-center gap-2"><Car size={16} className="text-[#85644E]" /> Parking for team vehicles</p>
              </div>
              <div className="mt-24 border-t border-[#CDBEB2] pt-6">
                <p className="eyebrow text-[#85644E]">Already a customer?</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Book with your customer ID.</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#685B53]">Use the separate booking form beside this message when your company already has a Serenity corporate customer ID.</p>
                <Link href="#corporate-booking" className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] underline decoration-[#B9A697] underline-offset-4">Go to booking form <ArrowUpRight size={15} /></Link>
              </div>
            </div>

            <div className="space-y-10 lg:col-span-8 lg:space-y-12">
              <section id="corporate-question" className="border border-[#DED5CD] bg-[#FCFBF9] p-5 sm:p-8 lg:p-10">
                <div className="border-b border-[#E5DDD6] pb-5">
                  <p className="eyebrow text-[#85644E]">Have a question?</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Ask about a corporate stay.</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#685B53]">Use this short enquiry form for rates, invoices, longer stays, team arrangements, or anything you want to clarify before booking.</p>
                </div>
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
                    <button type="submit" className="inline-flex w-full items-center justify-center gap-2 border border-[#2D2622] bg-white px-5 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-[#2D2622] hover:bg-[#EEE8E1] disabled:cursor-not-allowed disabled:opacity-60" disabled={enquirySubmitting}>{enquirySubmitting ? "Sending question…" : "Send corporate question"}<ArrowUpRight size={15} /></button>
                  </form>
                )}
              </section>

              <section id="corporate-booking" className="border border-[#DED5CD] bg-[#FCFBF9] p-5 sm:p-8 lg:p-10">
                <div className="border-b border-[#E5DDD6] pb-5">
                  <p className="eyebrow text-[#85644E]">Existing corporate customers</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Book a corporate stay.</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#685B53]">Use this booking form if Serenity has already issued your company a corporate customer ID.</p>
                </div>
              {formSubmitted ? (
                  <div className="flex min-h-[30rem] flex-col items-center justify-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-none bg-[#2D2622] text-white"><CheckCircle2 size={27} /></div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Corporate stay reserved.</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#685B53]">Thank you, {formData.companyName || "your team"}. The selected houses are now held together in the shared Serenity calendar.</p>
                  {submittedReference && <p className="mt-4 border-y border-[#D8CCC4] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#85644E]">Reference {submittedReference}</p>}
                  <button type="button" className="mt-7 border border-[#2D2622] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] hover:bg-[#2D2622] hover:text-white" onClick={() => { setFormSubmitted(false); setSubmissionKey(""); setSubmittedReference(""); }}>Book another stay</button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="mt-6 space-y-7">
                  <div className="border border-[#B9A697] bg-[#EEE8E1] p-4">
                    <FormInput id="corp-customer-id" label="Corporate customer ID *" required maxLength={80} value={formData.customerId} onChange={(event) => setFormData({ ...formData, customerId: event.target.value.toUpperCase() })} placeholder="Enter the ID issued by Serenity" />
                    <p className="mt-2 text-xs leading-5 text-[#685B53]">This ID is required for existing corporate customers and is stored with the reservation.</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormInput id="corp-company-name" label="Company name *" required value={formData.companyName} onChange={(event) => setFormData({ ...formData, companyName: event.target.value })} placeholder="e.g. Cardinia Infrastructure Group" />
                    <FormInput id="corp-contact-name" label="Contact name *" required value={formData.contactName} onChange={(event) => setFormData({ ...formData, contactName: event.target.value })} placeholder="Full name" />
                    <FormInput id="corp-email" label="Business email *" type="email" required value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} placeholder="corporate@company.com.au" />
                    <FormInput id="corp-phone" label="Phone number *" type="tel" required value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} placeholder="+61 400 000 000" />
                    <div ref={corporateDatePickerRef} className={`relative sm:col-span-2 ${calendarOpen ? "z-30" : "z-0"}`}>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <button
                          type="button"
                          className={`field min-h-[4.55rem] text-left ${calendarOpen ? "border-[#7A4E2D] bg-[#F8F6F2] shadow-[inset_0_0_0_2px_rgba(122,78,45,0.18)]" : "hover:border-[#7A4E2D]"}`}
                          onClick={() => setCalendarOpen(true)}
                          aria-expanded={calendarOpen}
                          aria-controls="corporate-date-calendar"
                        >
                          <span className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase text-stone-500"><CalendarCheck size={14} /> Expected arrival *</span>
                          <strong className="mt-1 block text-sm font-semibold text-stone-900">{formData.arrival ? formatDateAu(formData.arrival) : "Add date"}</strong>
                        </button>
                        <button
                          type="button"
                          className={`field min-h-[4.55rem] text-left ${calendarOpen ? "border-[#7A4E2D] bg-[#F8F6F2] shadow-[inset_0_0_0_2px_rgba(122,78,45,0.18)]" : "hover:border-[#7A4E2D]"}`}
                          onClick={() => setCalendarOpen(true)}
                          aria-expanded={calendarOpen}
                          aria-controls="corporate-date-calendar"
                        >
                          <span className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase text-stone-500"><CalendarCheck size={14} /> Expected departure *</span>
                          <strong className="mt-1 block text-sm font-semibold text-stone-900">{formData.departure ? formatDateAu(formData.departure) : "Add date"}</strong>
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
                    <div><label className="label mb-1.5 block text-xs font-bold text-stone-900" htmlFor="corp-guests">Guests / employees *</label><select id="corp-guests" className="field bg-white text-sm font-medium" value={formData.guests} onChange={(event) => setFormData({ ...formData, guests: event.target.value })}><option value="1-3">1 - 3 guests</option><option value="4-7">4 - 7 guests</option><option value="8-14">8 - 14 guests</option><option value="15-21">15 - 21 guests</option></select></div>
                    <div><label className="label mb-1.5 block text-xs font-bold text-stone-900" htmlFor="corp-houses">Houses needed *</label><select id="corp-houses" className="field bg-white text-sm font-medium" value={formData.housesNeeded} onChange={(event) => updateHouseCount(event.target.value)}><option value="1">1 house</option><option value="2">2 houses beside each other</option><option value="3">All 3 houses beside each other</option></select></div>
                    <div><label className="label mb-1.5 block text-xs font-bold text-stone-900" htmlFor="corp-purpose">Stay purpose</label><select id="corp-purpose" className="field bg-white text-sm font-medium" value={formData.purpose} onChange={(event) => setFormData({ ...formData, purpose: event.target.value })}><option>Contractor project crew</option><option>Employee relocation</option><option>Business travel</option><option>Training or event</option><option>Other</option></select></div>
                    <FormInput id="corp-abn" label="ABN (optional)" value={formData.abn} onChange={(event) => setFormData({ ...formData, abn: event.target.value })} placeholder="12 345 678 901" />
                    <FormInput id="corp-po" label="Purchase order (optional)" value={formData.purchaseOrder} onChange={(event) => setFormData({ ...formData, purchaseOrder: event.target.value })} placeholder="PO or cost centre" />
                  </div>

                  <div className="border-t border-[#E5DDD6] pt-6">
                    <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold">Select adjacent houses *</p><p className="mt-1 text-xs text-[#685B53]">The house count updates automatically.</p></div><span className="text-xs font-bold uppercase tracking-[0.14em] text-[#85644E]">{selectedProperties.length} selected</span></div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {properties.map((property) => {
                        const checked = formData.propertySlugs.includes(property.slug);
                        const state = availability[property.slug];
                        const unavailable = selectedDates.length > 0 && state === "unavailable";
                        const disabled = !checked && unavailable;
                        return <label key={property.slug} className={`flex items-center justify-between gap-3 border p-3 text-sm font-semibold transition-colors ${disabled ? "cursor-not-allowed border-[#DED5CD] bg-[#E8E2DD] text-stone-400" : checked ? "cursor-pointer border-[#2D2622] bg-[#EEE8E1]" : "cursor-pointer border-[#DED5CD] bg-white hover:border-[#8B6A54]"}`}><span className="flex items-center gap-2"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => updateHouseSelection(property.slug, event.target.checked)} className="h-4 w-4 accent-[#2D2622]" /><span>{property.name.replace(" - Whole", "")}</span></span>{selectedDates.length > 0 && <span className={`text-[10px] uppercase tracking-[0.12em] ${state === "available" ? "text-emerald-700" : state === "unavailable" ? "text-red-700" : "text-stone-500"}`}>{state === "available" ? "Available" : state === "unavailable" ? "Unavailable" : state === "error" ? "Retry" : "Checking"}</span>}</label>;
                      })}
                    </div>
                    {selectedDates.length > 0 && <div className={`mt-4 border p-3 text-xs font-semibold ${allSelectedAvailable ? "border-emerald-300 bg-emerald-50 text-emerald-800" : availabilityReady ? "border-red-200 bg-red-50 text-red-700" : "border-[#D8CCC4] bg-white text-[#685B53]"}`} aria-live="polite">{allSelectedAvailable ? "All selected houses are available in the shared Serenity calendar." : availabilityReady ? "At least one selected house is unavailable. Choose another house or date range." : "Checking bookings, manual blocks, and connected calendars…"}</div>}
                    {corporateNights > 0 && selectedProperties.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-[#D7C9BC] bg-[#F4EEE8] p-4"><div><p className="text-sm font-bold">Indicative estimate</p><p className="mt-1 text-xs text-[#685B53]">{selectedProperties.length} house{selectedProperties.length === 1 ? "" : "s"} · {corporateNights} night{corporateNights === 1 ? "" : "s"}</p></div><p className="text-xl font-semibold text-[#85644E]">{formatAud(estimatedCorporateTotal)} AUD</p></div>}
                  </div>

                  <label className="flex items-start gap-3 border border-[#DED5CD] bg-white p-4 text-sm font-semibold"><input type="checkbox" checked={formData.invoiceRequested} onChange={(event) => setFormData({ ...formData, invoiceRequested: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#2D2622]" /><span>Request a GST tax invoice with ABN and purchase order details.</span></label>
                  <TextArea id="corp-notes" label="Notes or requirements" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} placeholder="Tell us about roster flexibility, parking, billing, or anything else your team needs..." rows={4} />
                  {formError && <p className="border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700" role="alert" aria-live="polite">{formError}</p>}
                  <button type="submit" className="inline-flex w-full items-center justify-center gap-2 bg-[#2D2622] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-[#85644E] disabled:cursor-not-allowed disabled:opacity-60" disabled={formSubmitting || !allSelectedAvailable || !directBookingEnabled}>
                    {formSubmitting ? "Reserving…" : directBookingEnabled ? "Book corporate stay" : "Enquiry required"}<ArrowUpRight size={15} />
                  </button>
                  {!directBookingEnabled && selectedProperties.length > 0 && <p className="text-xs leading-5 text-[#685B53]">The selected house rules require review before confirmation. Use the separate corporate enquiry form above and the Serenity team can help.</p>}
                </form>
              )}
              </section>
            </div>
          </div>
        </div>
      </section>

      <section className="container max-w-[92rem] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4"><p className="eyebrow text-[#85644E]">Good to know</p><ScrollWipeText as="h2" className="mt-3 text-4xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-6xl" revealClassName="text-[#2D2622]">Clear answers before arrival.</ScrollWipeText></div>
          <div className="lg:col-span-8">
            {corporateFaqs.map(([question, answer]) => <details key={question} className="group border-t border-[#DED5CD] py-5 last:border-b"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold tracking-[-0.02em] marker:hidden"><span>{question}</span><ChevronDown size={18} className="shrink-0 text-[#85644E] transition-transform group-open:rotate-180" /></summary><p className="max-w-2xl pr-8 pt-3 text-sm leading-6 text-[#685B53]">{answer}</p></details>)}
          </div>
        </div>
      </section>

      <section className="border-y border-[#DED5CD] bg-[#EEE8E1]">
        <div className="container max-w-[92rem] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow text-[#85644E]">The neighbourhood</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">A calm base in Pakenham.</h2></div><Link href="/location" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] underline decoration-[#B9A697] underline-offset-4">Explore the location <ArrowUpRight size={15} /></Link></div>
          <div className="h-[26rem] sm:h-[34rem]"><ApproximateMap borderless fullHeight title="Serenity houses area" /></div>
        </div>
      </section>

      <section className="bg-[#2D2622] text-[#F8F6F2]">
        <div className="container max-w-[92rem] px-5 py-14 sm:px-8 sm:py-20 lg:flex lg:items-end lg:justify-between lg:gap-16 lg:px-12">
          <div><p className="eyebrow text-[#CDBBAA]">Direct support</p><ScrollWipeText as="h2" tone="light" className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl" revealClassName="text-[#F8F6F2]">A better base for the people doing the work.</ScrollWipeText></div>
          <div className="mt-8 max-w-sm lg:mt-0"><p className="text-sm leading-6 text-[#D7CCC4]">We're here to make company stays simple, from the first enquiry to the final invoice.</p><div className="mt-6 space-y-2 text-sm text-[#D7CCC4]"><p className="flex items-center gap-2"><Phone size={15} /> <a href={`tel:${contact.phoneNumber.replace(/[^+\d]/g, "")}`} className="hover:text-white">{contact.phoneNumber}</a></p><p className="flex items-center gap-2"><Mail size={15} /> <a href={`mailto:${contact.corporateEnquiryEmail}`} className="break-words hover:text-white">{contact.corporateEnquiryEmail}</a></p></div></div>
        </div>
      </section>
    </main>
  );
}
