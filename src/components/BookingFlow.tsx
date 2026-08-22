"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, Printer, ShieldCheck, Lock, Building2 } from "lucide-react";
import type { Property } from "@/src/data/properties";
import { useBooking } from "@/src/context/BookingContext";
import { calculatePrice, formatAud, formatDateAu, nightsBetween, reservationCode, type PriceBreakdown } from "@/src/lib/booking";
import { FormInput, TextArea } from "@/src/components/UI";
import { PriceBreakdownView } from "@/src/components/BookingWidgets";

const steps = ["Review stay", "Guest details", "Stripe payment", "Confirmation"];

type PromotionPreview = { code: string; discount: number; price: PriceBreakdown };

async function requestPromotionPreview(property: Property, booking: { checkIn?: string; checkout?: string; guests: { adults: number; children: number; infants: number; pets: number }; guestDetails?: Record<string, string | boolean> }, code: string) {
  const response = await fetch("/api/promotions/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertySlug: property.slug,
      checkIn: booking.checkIn,
      checkout: booking.checkout,
      guests: booking.guests,
      corporate: booking.guestDetails?.corporate === true,
      code,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.valid) throw new Error(result.error || "That voucher code could not be applied.");
  return { code: String(result.code), discount: Number(result.discount ?? 0), price: result.price as PriceBreakdown } satisfies PromotionPreview;
}

function VoucherForm({ value, onChange, onApply, onClear, error, busy, applied }: { value: string; onChange: (value: string) => void; onApply: () => void; onClear: () => void; error: string; busy: boolean; applied: boolean }) {
  return (
    <div className="border border-stone-200 bg-[#FAF8F5] p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-700">
          Voucher code
          <input className="field mt-1 w-full font-mono uppercase tracking-[0.08em]" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} placeholder="Enter code" maxLength={40} aria-describedby={error ? "voucher-error" : undefined} />
        </label>
        {applied ? <button type="button" className="btn-outline-dark min-h-10 px-4 text-sm" onClick={onClear}>Remove</button> : <button type="button" className="btn-secondary min-h-10 px-4 text-sm" onClick={onApply} disabled={busy || !value.trim()}>{busy ? "Checking…" : "Apply code"}</button>}
      </div>
      {applied && !error && <p className="mt-3 text-sm font-semibold text-emerald-800" role="status">Voucher applied. Your final total has been updated.</p>}
      {error && <p id="voucher-error" className="mt-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
    </div>
  );
}

export function BookingProgress({ active }: { active: number }) {
  return (
    <ol className="mb-8 grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => (
        <li
          key={step}
          className={`rounded-none border p-4 text-sm font-bold transition-colors ${
            index <= active
              ? "border-[#111111] bg-[#111111] text-white shadow-xs"
              : "border-stone-200 bg-white text-stone-600"
          }`}
        >
          <span className="text-[0.65rem] opacity-75 uppercase tracking-wider block">Step {index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function useCurrentProperty() {
  const { booking } = useBooking();
  const [property, setProperty] = useState<Property>();

  useEffect(() => {
    if (!booking.propertySlug) return;
    let active = true;
    fetch(`/api/properties/${booking.propertySlug}`)
      .then((response) => response.ok ? response.json() : null)
      .then((value: Property | null) => { if (active) setProperty(value ?? undefined); })
      .catch(() => { if (active) setProperty(undefined); });
    return () => { active = false; };
  }, [booking.propertySlug]);

  return property;
}

export function ReviewBookingPage() {
  const { booking } = useBooking();
  const property = useCurrentProperty();
  const { setBooking } = useBooking();
  const [voucherCode, setVoucherCode] = useState(booking.promotionCode ?? "");
  const [voucherError, setVoucherError] = useState("");
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [promotionPreview, setPromotionPreview] = useState<PromotionPreview | null>(null);
  if (!property || !booking.checkIn || !booking.checkout) return <MissingBooking />;
  const nights = nightsBetween(booking.checkIn, booking.checkout);

  const applyVoucher = async () => {
    setVoucherError("");
    setVoucherBusy(true);
    try {
      const preview = await requestPromotionPreview(property, booking, voucherCode.trim());
      setPromotionPreview(preview);
      setBooking({ promotionCode: preview.code });
    } catch (error) {
      setPromotionPreview(null);
      setVoucherError(error instanceof Error ? error.message : "That voucher code could not be applied.");
    } finally {
      setVoucherBusy(false);
    }
  };

  const clearVoucher = () => {
    setVoucherCode("");
    setPromotionPreview(null);
    setVoucherError("");
    setBooking({ promotionCode: "" });
  };

  return (
    <BookingFrame active={0}>
      <div className="grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7 xl:col-span-8 card p-6 bg-white space-y-6">
          <div>
            <span className="eyebrow flex items-center gap-1">
              <Building2 size={13} /> Direct Reservation Review
            </span>
            <h1 className="text-3xl font-extrabold text-stone-900 mt-1">Review Your Stay Details</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 p-4 rounded-none bg-[#FAF8F5] border border-stone-200">
            {property.featuredImage ? <Image src={property.featuredImage} alt={`${property.name} thumbnail`} width={640} height={420} sizes="(max-width: 640px) 100vw, 176px" className="h-32 w-full sm:w-44 rounded-none object-cover" /> : <div className="h-32 w-full rounded-none bg-[#E8DED6] sm:w-44" aria-label="Property photo not available" />}
            <div className="space-y-1.5">
              <span className="text-[0.7rem] font-bold text-[#7A4E2D] uppercase tracking-wider">{property.propertyType}</span>
              <h2 className="text-xl font-bold text-stone-900">{property.name}</h2>
              <p className="text-xs text-stone-600">{property.location}</p>
              <p className="text-xs font-semibold text-stone-800 pt-1">
                📅 {formatDateAu(booking.checkIn)} to {formatDateAu(booking.checkout)} ({nights} night{nights > 1 ? "s" : ""})
              </p>
              <p className="text-xs text-stone-600">
                👥 {booking.guests.adults + booking.guests.children} guests ({booking.guests.adults} adults, {booking.guests.children} children, {booking.guests.infants} infants), {booking.guests.pets} pets
              </p>
            </div>
          </div>

          <div className="rounded-none bg-[#FAF5EF] border border-[#EADCCF] p-4 text-xs text-stone-700 space-y-1">
            <p className="font-bold text-[#7A4E2D] flex items-center gap-1.5">
              <ShieldCheck size={15} /> Direct Booking Advantage
            </p>
            <p>No customer account registration required. Your stay dates are held temporarily during checkout. Exact address instructions are sent upon confirmation.</p>
          </div>

          <VoucherForm value={voucherCode} onChange={setVoucherCode} onApply={() => void applyVoucher()} onClear={clearVoucher} error={voucherError} busy={voucherBusy} applied={Boolean(promotionPreview)} />

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <Link className="btn-outline-dark justify-center text-xs" href={`/properties/${property.slug}`}>
              Edit Dates or Guests
            </Link>
            <Link className="btn-primary justify-center text-xs" href="/booking/guest-details">
              Continue to Guest Details →
            </Link>
          </div>
        </section>

        <aside className="lg:col-span-5 xl:col-span-4 card p-6 bg-white h-fit space-y-4">
          <h2 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">Price Summary (AUD)</h2>
          <PriceBreakdownView property={property} checkIn={booking.checkIn} checkout={booking.checkout} guests={booking.guests} corporate={booking.guestDetails?.corporate === true} price={promotionPreview?.price} />
        </aside>
      </div>
    </BookingFrame>
  );
}

export function GuestDetailsPage() {
  const router = useRouter();
  const { booking, setBooking } = useBooking();
  const property = useCurrentProperty();
  const [corporate, setCorporate] = useState(Boolean(booking.guestDetails?.corporate));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string>>({
    firstName: "", lastName: "", email: "", phone: "", country: "Australia", address: "", city: "", state: "", postcode: "", arrival: "", purpose: "Holiday", requests: "",
    companyName: "", businessContact: "", businessEmail: "", businessPhone: "", billingAddress: "", abn: "", po: "", employees: "",
    ...Object.fromEntries(Object.entries(booking.guestDetails ?? {}).map(([k, v]) => [k, String(v)])),
  });

  if (!property || !booking.checkIn || !booking.checkout) return <MissingBooking />;

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const required = ["firstName", "lastName", "email", "phone", "country", "address", "city", "state", "postcode", "arrival", "purpose"];
    const nextErrors = Object.fromEntries(required.filter((key) => !form[key]).map((key) => [key, "Required"]));
    if (!form.email.includes("@")) nextErrors.email = "Enter a valid email address.";
    if (corporate) ["companyName", "businessContact", "businessEmail", "businessPhone", "billingAddress"].forEach((key) => { if (!form[key]) nextErrors[key] = "Required for corporate bookings"; });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBooking({ guestDetails: { ...form, corporate } });
    router.push("/booking/payment");
  };

  return (
    <BookingFrame active={1}>
      <form onSubmit={submit} className="card p-6 bg-white max-w-4xl mx-auto space-y-6">
        <div>
          <span className="eyebrow">Guest Information</span>
          <h1 className="text-3xl font-extrabold text-stone-900 mt-1">Enter Guest Contact Details</h1>
          <p className="text-xs text-stone-500 mt-1">You are booking as a guest. No password or customer account creation needed.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {["firstName", "lastName", "email", "phone", "country", "address", "city", "state", "postcode", "arrival"].map((key) => (
            <FormInput key={key} id={key} label={labelize(key)} value={form[key]} error={errors[key]} onChange={(e) => update(key, e.target.value)} />
          ))}
          
          <label className="block text-xs font-bold text-stone-900">
            Purpose of stay
            <select className="field mt-1 text-sm font-medium" value={form.purpose} onChange={(e) => update("purpose", e.target.value)}>
              {["Holiday", "Visiting family or friends", "Business travel", "Contractor project", "Employee relocation", "Temporary housing", "Other"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <TextArea id="requests" label="Special Requests or Notes" value={form.requests} onChange={(e) => update("requests", e.target.value)} />
        </div>

        <div className="rounded-none border border-stone-200 bg-[#FAF8F5] p-5 space-y-4">
          <label className="flex items-center gap-3 font-bold text-sm text-stone-900 cursor-pointer">
            <input type="checkbox" checked={corporate} onChange={(e) => setCorporate(e.target.checked)} className="accent-[#7A4E2D] w-4 h-4" />
            Is a company paying for this stay? (Corporate / Tax Invoice)
          </label>

          {corporate && (
            <div className="grid gap-4 border-t border-stone-200 pt-4 md:grid-cols-2">
              {["companyName", "businessContact", "businessEmail", "businessPhone", "billingAddress", "abn", "po", "employees"].map((key) => (
                <FormInput key={key} id={key} label={labelize(key)} value={form[key]} error={errors[key]} onChange={(e) => update(key, e.target.value)} />
              ))}
              <p className="md:col-span-2 rounded-none bg-[#FAF5EF] border border-[#EADCCF] p-3 text-xs text-[#7A4E2D] font-medium">
                Note: Serenity can issue an Australian Tax Invoice (GST) and support multi-house bookings for teams staying at Serenity 7, 9, or 11.
              </p>
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary w-full justify-center text-base">
          Continue to Stripe Payment →
        </button>
      </form>
    </BookingFrame>
  );
}

export function PaymentPage() {
  const { booking, setBooking } = useBooking();
  const property = useCurrentProperty();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [voucherCode, setVoucherCode] = useState(booking.promotionCode ?? "");
  const [voucherError, setVoucherError] = useState("");
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [promotionPreview, setPromotionPreview] = useState<PromotionPreview | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (params.get("payment") !== "cancelled") return;
    const messageTimer = window.setTimeout(() => setError("Payment was cancelled. Your dates are available to try again."), 0);
    if (reference) {
      void fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      }).catch(() => undefined);
    }
    return () => window.clearTimeout(messageTimer);
  }, []);

  /* Voucher state is synchronized with the server validation response. */
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!property || !booking.checkIn || !booking.checkout || !booking.promotionCode) return;
    let cancelled = false;
    setVoucherBusy(true);
    void requestPromotionPreview(property, booking, booking.promotionCode)
      .then((preview) => { if (!cancelled) { setVoucherCode(preview.code); setPromotionPreview(preview); setVoucherError(""); } })
      .catch((previewError: unknown) => { if (!cancelled) { setPromotionPreview(null); setVoucherError(previewError instanceof Error ? previewError.message : "That voucher is no longer available."); } })
      .finally(() => { if (!cancelled) setVoucherBusy(false); });
    return () => { cancelled = true; };
  }, [booking.checkIn, booking.checkout, booking.promotionCode, booking.guests, booking.guestDetails, property]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  if (!property || !booking.checkIn || !booking.checkout || !booking.guestDetails) return <MissingBooking />;

  const applyPaymentVoucher = async () => {
    if (!property) return;
    setVoucherError("");
    setVoucherBusy(true);
    try {
      const preview = await requestPromotionPreview(property, booking, voucherCode.trim());
      setPromotionPreview(preview);
      setBooking({ promotionCode: preview.code });
    } catch (previewError) {
      setPromotionPreview(null);
      setVoucherError(previewError instanceof Error ? previewError.message : "That voucher code could not be applied.");
    } finally {
      setVoucherBusy(false);
    }
  };

  const clearPaymentVoucher = () => {
    setVoucherCode("");
    setPromotionPreview(null);
    setVoucherError("");
    setBooking({ promotionCode: "" });
  };

  const price = promotionPreview?.price ?? calculatePrice(property, booking.checkIn, booking.checkout, booking.guests, booking.guestDetails?.corporate === true);

  const pay = async () => {
    setError("");
    setProcessing(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertySlug: property.slug, checkIn: booking.checkIn, checkout: booking.checkout, guests: booking.guests, guestDetails: booking.guestDetails, corporateDetails: booking.guestDetails, notes: booking.guestDetails?.requests, promotionCode: booking.promotionCode }),
      });
      const result = await response.json();
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error || "Could not start secure checkout.");
      setBooking({ reservationReference: result.booking?.reference ?? reservationCode(property.slug), paymentStatus: "pending" });
      window.location.assign(result.checkoutUrl);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Could not start secure checkout.");
      setProcessing(false);
    }
  };

  return (
    <BookingFrame active={2}>
      <div className="grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7 xl:col-span-8 card p-6 bg-white space-y-6">
          <div className="rounded-none bg-[#FAF5EF] border border-[#EADCCF] p-4 text-sm font-semibold text-[#5A463A] flex items-start gap-2">
            <Lock size={17} className="text-[#7A4E2D] shrink-0 mt-0.5" />
            <span>You will be redirected to Stripe’s secure checkout page. Serenity does not see or store your card details.</span>
          </div>

          <div>
            <span className="eyebrow">Secure PCI Payment</span>
            <h1 className="text-3xl font-extrabold text-stone-900 mt-1">Stripe Checkout</h1>
            <p className="text-sm text-stone-500 mt-1">Complete your payment securely in Australian Dollars (AUD), then return here for your booking confirmation.</p>
          </div>

          <div className="rounded-none border border-stone-200 bg-[#FAF8F5] p-5 space-y-3">
            <p className="font-bold text-stone-900">What happens next?</p>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-600">
              <li>Review the secure Stripe payment page.</li>
              <li>Enter your card details directly with Stripe.</li>
              <li>Return to Serenity to receive your confirmed reservation reference.</li>
            </ol>
          </div>

          <VoucherForm value={voucherCode} onChange={setVoucherCode} onApply={() => void applyPaymentVoucher()} onClear={clearPaymentVoucher} error={voucherError} busy={voucherBusy} applied={Boolean(promotionPreview)} />

          {error && <p className="text-sm font-semibold text-red-700 bg-red-50 p-3 rounded-none border border-red-200" role="alert">{error}</p>}

          <button type="button" className="btn-primary w-full justify-center text-base" onClick={pay} disabled={processing || voucherBusy || Boolean(booking.promotionCode && !promotionPreview)}>
            {processing ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />} Continue to Stripe · {formatAud(price.total)} AUD
          </button>
        </section>

        <aside className="lg:col-span-5 xl:col-span-4 card p-6 bg-white h-fit space-y-4">
          <h2 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">Reservation Summary</h2>
          <div className="text-xs space-y-1 text-stone-600">
            <p className="font-bold text-stone-900 text-sm">{property.name}</p>
            <p>Dates: {formatDateAu(booking.checkIn)} to {formatDateAu(booking.checkout)}</p>
            <p>Guest: {booking.guestDetails?.firstName} {booking.guestDetails?.lastName}</p>
          </div>
          <div className="pt-2">
            <PriceBreakdownView property={property} checkIn={booking.checkIn} checkout={booking.checkout} guests={booking.guests} corporate={booking.guestDetails?.corporate === true} price={promotionPreview?.price} />
          </div>
        </aside>
      </div>
    </BookingFrame>
  );
}

export function ConfirmationPage() {
  const { booking, setBooking } = useBooking();
  const property = useCurrentProperty();
  const verificationStarted = useRef(false);
  const [verification, setVerification] = useState<"checking" | "paid" | "error">(booking.paymentStatus === "paid" ? "paid" : "checking");
  const [verificationError, setVerificationError] = useState("");

  useEffect(() => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      const missingSessionTimer = window.setTimeout(() => {
        if (booking.paymentStatus !== "paid") {
          setVerificationError("This confirmation is missing its Stripe payment session. Please return to payment and try again.");
          setVerification("error");
        }
      }, 0);
      return () => window.clearTimeout(missingSessionTimer);
    }

    void fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.paid) throw new Error(result.error || "Payment could not be verified.");
        setBooking({ paymentStatus: "paid", reservationReference: result.booking?.reference });
        setVerification("paid");
      })
      .catch((error: unknown) => {
        setVerificationError(error instanceof Error ? error.message : "We could not verify this payment yet.");
        setVerification("error");
      });
  }, [booking.paymentStatus, setBooking]);

  if (!property || !booking.checkIn || !booking.checkout) return <MissingBooking />;

  const price = calculatePrice(property, booking.checkIn, booking.checkout, booking.guests);
  const reference = booking.reservationReference ?? reservationCode(property.slug);

  if (verification === "checking") {
    return (
      <BookingFrame active={3}>
        <section className="card mx-auto max-w-2xl p-10 bg-white text-center space-y-4">
          <Loader2 className="mx-auto animate-spin text-[#7A4E2D]" size={34} aria-hidden="true" />
          <h1 className="text-2xl font-extrabold text-stone-900">Confirming your Stripe payment…</h1>
          <p className="text-sm text-stone-600">Please wait while we securely confirm your reservation.</p>
        </section>
      </BookingFrame>
    );
  }

  if (verification === "error") {
    return (
      <BookingFrame active={2}>
        <section className="card mx-auto max-w-2xl p-8 bg-white text-center space-y-4">
          <h1 className="text-2xl font-extrabold text-stone-900">We could not confirm the payment</h1>
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-none p-4" role="alert">{verificationError}</p>
          <Link className="btn-primary inline-flex" href="/booking/payment">Return to payment</Link>
        </section>
      </BookingFrame>
    );
  }

  return (
    <BookingFrame active={3}>
      <section className="card mx-auto max-w-3xl p-8 bg-white text-center space-y-6">
        <div className="w-16 h-16 rounded-none bg-[#FAF5EF] border border-[#EADCCF] flex items-center justify-center mx-auto text-[#7A4E2D]">
          <CheckCircle2 size={40} />
        </div>

        <div>
          <span className="eyebrow">Reservation Confirmed</span>
        <h1 className="text-4xl font-extrabold text-stone-900 mt-1">Booking Confirmation #{reference}</h1>
          <p className="text-xs text-stone-500 mt-1">A confirmation receipt has been generated for your record.</p>
        </div>

        <div className="grid gap-4 text-left sm:grid-cols-2 bg-[#FAF8F5] p-5 rounded-none border border-stone-200">
          <Info label="Property" value={property.name} />
          <Info label="Dates" value={`${formatDateAu(booking.checkIn)} to ${formatDateAu(booking.checkout)}`} />
          <Info label="Guests" value={`${booking.guests.adults + booking.guests.children} guests, ${booking.guests.pets} pets`} />
          <Info label="Total Paid" value={`${formatAud(price.total)} AUD`} />
          <Info label="Guest Name" value={`${booking.guestDetails?.firstName ?? "Guest"} ${booking.guestDetails?.lastName ?? ""}`} />
          <Info label="Reservation Ref" value={reference} />
        </div>

        <div className="rounded-none bg-stone-900 text-white p-4 text-left text-xs space-y-1">
          <p className="font-bold text-[#B88A5A] flex items-center gap-1.5">
            <ShieldCheck size={15} /> Access & Check-In Information
          </p>
          <p className="text-stone-300">Exact street address and keypad access codes for key safe will be dispatched to {booking.guestDetails?.email ?? "your email"} prior to check-in at 3:00 PM.</p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link className="btn-primary text-xs" href="/">
            Return to Homepage
          </Link>
          <button className="btn-outline-dark text-xs" onClick={() => window.print()}>
            <Printer size={15} /> Print Confirmation
          </button>
        </div>
      </section>
    </BookingFrame>
  );
}

function BookingFrame({ active, children }: { active: number; children: React.ReactNode }) {
  return (
    <div className="section bg-[#FAF8F5] pt-8 pb-16">
      <div className="container">
        <BookingProgress active={active} />
        {children}
      </div>
    </div>
  );
}

function MissingBooking() {
  return (
    <BookingFrame active={0}>
      <div className="card mx-auto max-w-xl p-8 bg-white text-center space-y-4">
        <h1 className="text-3xl font-bold text-stone-900">Please select a house and stay dates first.</h1>
        <p className="text-xs text-stone-600">Your reservation session requires a house selection, check-in, and checkout date.</p>
        <Link className="btn-primary inline-flex text-xs" href="/houses">
          Browse Serenity Houses
        </Link>
      </div>
    </BookingFrame>
  );
}

function labelize(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">{label}</span>
      <span className="text-base font-bold text-stone-900">{value}</span>
    </div>
  );
}
