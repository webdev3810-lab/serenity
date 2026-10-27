"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CreditCard, Download, Image as ImageIcon, Loader2, ShieldCheck, Lock } from "lucide-react";
import type { Property } from "@/src/data/properties";
import { useBooking } from "@/src/context/BookingContext";
import { calculatePrice, formatAud, formatDateAu, nightsBetween, reservationCode } from "@/src/lib/booking";
import { receiptCode } from "@/src/lib/paymentReceipt";
import { FormInput, TextArea } from "@/src/components/UI";
import { PriceBreakdownView } from "@/src/components/BookingWidgets";
import ScrollWipeText from "@/src/components/homepage/ScrollWipeText";
import { freeCancellationText } from "@/src/lib/cancellationPolicy";

const steps = ["Review stay", "Guest details", "Stripe payment", "Confirmation"];

export function BookingProgress({ active }: { active: number }) {
  return (
    <ol className="booking-progress mb-8 grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => (
        <li
          key={step}
          className={`booking-progress-step rounded-none border p-4 text-sm font-bold transition-colors ${
            index <= active
              ? "is-complete border-[#111111] bg-[#111111] text-white shadow-xs"
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
  if (!property || !booking.checkIn || !booking.checkout) return <MissingBooking />;
  const nights = nightsBetween(booking.checkIn, booking.checkout);

  return (
    <BookingFrame active={0}>
      <div className="booking-review-layout">
        <section className="booking-review-panel">
          <header className="booking-review-header">
            <span className="booking-review-kicker">Direct reservation</span>
            <ScrollWipeText as="h1">Review your stay.</ScrollWipeText>
          </header>

          <article className="booking-review-property">
            <div className="booking-review-property-media">
              {property.featuredImage ? <Image src={property.featuredImage} alt={`${property.name} exterior`} width={960} height={720} sizes="(max-width: 720px) 100vw, 300px" /> : <div className="booking-review-property-placeholder" aria-label="Property photo not available" />}
            </div>
            <div className="booking-review-property-copy">
              <span className="booking-review-property-type">{property.propertyType}</span>
              <h2>{property.name}</h2>
              <p className="booking-review-property-location">{property.location}</p>
              <dl className="booking-review-stay-facts">
                <div>
                  <dt>Dates</dt>
                  <dd>{formatDateAu(booking.checkIn)} — {formatDateAu(booking.checkout)}</dd>
                </div>
                <div>
                  <dt>Length</dt>
                  <dd>{nights} night{nights > 1 ? "s" : ""}</dd>
                </div>
                <div>
                  <dt>Guests</dt>
                  <dd>{booking.guests.adults + booking.guests.children} guests · {booking.guests.adults} adults · {booking.guests.children} children · {booking.guests.infants} infants · {booking.guests.pets} pets</dd>
                </div>
              </dl>
            </div>
          </article>

          <div className="booking-review-advantage">
            <p>Direct booking advantage</p>
            <span>No customer account registration required. Your stay dates are held temporarily during checkout. Exact address instructions are sent upon confirmation.</span>
          </div>

          <div className="booking-review-actions">
            <Link className="btn-outline-dark" href={`/properties/${property.slug}`}>
              Edit Dates or Guests
            </Link>
            <Link className="btn-primary" href="/booking/guest-details">
              Continue to Guest Details →
            </Link>
          </div>
        </section>

        <aside className="booking-review-price">
          <span className="booking-review-kicker">Your total</span>
          <h2>Price summary <small>AUD</small></h2>
          <PriceBreakdownView property={property} checkIn={booking.checkIn} checkout={booking.checkout} guests={booking.guests} />
          <p className="mt-5 rounded-xl border border-[#b9cbd7] bg-[#f3f8fb] p-4 text-sm leading-relaxed text-[#002844]"><strong>{freeCancellationText(booking.checkIn, property.freeCancellationDays)}</strong> Contact Serenity to request cancellation. After this deadline, refund requests are reviewed.</p>
        </aside>
      </div>
    </BookingFrame>
  );
}

export function GuestDetailsPage() {
  const router = useRouter();
  const { booking, setBooking } = useBooking();
  const property = useCurrentProperty();
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
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBooking({ guestDetails: { ...form, corporate: false } });
    router.push("/booking/payment");
  };

  return (
    <BookingFrame active={1}>
      <form onSubmit={submit} className="card p-6 bg-white max-w-4xl mx-auto space-y-6">
        <div>
          <span className="eyebrow">Guest Information</span>
          <ScrollWipeText as="h1" className="text-3xl font-extrabold text-stone-900 mt-1">Enter Guest Contact Details</ScrollWipeText>
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

        <div className="rounded-none border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Booking for a company? Corporate reservations require a Partner ID. <Link href="/corporate-stays#corporate-booking" className="font-semibold underline text-[#002844]">Make a corporate booking</Link> or send an enquiry to request an ID.
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    const token = params.get("token");
    if (params.get("payment") !== "cancelled") return;
    let active = true;
    const messageTimer = window.setTimeout(() => setError(reference && token
      ? "Payment was cancelled. Checking when your dates become available..."
      : "Payment was cancelled. If your dates are still held, they will become available when checkout expires."), 0);
    if (reference && token) {
      void fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, token }),
      }).then((response) => {
        if (!active) return;
        setError(response.ok
          ? "Payment was cancelled. Your dates are available to try again."
          : response.status === 409
            ? "This checkout may have completed. Please check your confirmation before trying again."
            : "Payment was cancelled, but your dates may remain held until checkout expires. Please try again shortly.");
      }).catch(() => {
        if (active) setError("Payment was cancelled, but your dates may remain held until checkout expires. Please try again shortly.");
      });
    }
    return () => { active = false; window.clearTimeout(messageTimer); };
  }, []);

  if (!property || !booking.checkIn || !booking.checkout || !booking.guestDetails) return <MissingBooking />;

  const price = calculatePrice(property, booking.checkIn, booking.checkout, booking.guests);

  const pay = async () => {
    setError("");
    setProcessing(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertySlug: property.slug, checkIn: booking.checkIn, checkout: booking.checkout, guests: booking.guests, guestDetails: { ...booking.guestDetails, corporate: false }, notes: booking.guestDetails?.requests }),
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
            <ScrollWipeText as="h1" className="text-3xl font-extrabold text-stone-900 mt-1">Stripe Checkout</ScrollWipeText>
            <p className="text-sm text-stone-500 mt-1">Complete your payment securely in Australian Dollars (AUD), then return here for your booking confirmation.</p>
          </div>

          <div className="rounded-none border border-stone-200 bg-white p-5 space-y-3">
            <p className="font-bold text-stone-900">What happens next?</p>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-600">
              <li>Review the secure Stripe payment page.</li>
              <li>Enter your card details directly with Stripe.</li>
              <li>Return to Serenity to receive your confirmed reservation reference.</li>
            </ol>
          </div>

          {error && <p className="text-sm font-semibold text-red-700 bg-red-50 p-3 rounded-none border border-red-200" role="alert">{error}</p>}

          <button type="button" className="btn-primary w-full justify-center text-base" onClick={pay} disabled={processing}>
            {processing ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />} Continue to Stripe · {formatAud(price.total)}
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
            <PriceBreakdownView property={property} checkIn={booking.checkIn} checkout={booking.checkout} guests={booking.guests} />
            <p className="mt-4 rounded-xl border border-[#b9cbd7] bg-[#f3f8fb] p-3 text-sm leading-relaxed text-[#002844]"><strong>{freeCancellationText(booking.checkIn!, property.freeCancellationDays)}</strong> Contact Serenity to cancel. Later refund requests are reviewed.</p>
          </div>
        </aside>
      </div>
    </BookingFrame>
  );
}

export function ConfirmationPage() {
  const { booking, setBooking } = useBooking();
  const property = useCurrentProperty();
  const cardRef = useRef<HTMLElement>(null);
  const verificationStarted = useRef(false);
  const [verification, setVerification] = useState<"checking" | "paid" | "error">("checking");
  const [verificationError, setVerificationError] = useState("");
  const [verifiedReference, setVerifiedReference] = useState("");
  const [verifiedTotal, setVerifiedTotal] = useState<number | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verifiedCancellationDeadline, setVerifiedCancellationDeadline] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [savingImage, setSavingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      void Promise.resolve().then(() => {
        setVerificationError("This confirmation is missing its Stripe payment session. Please return to payment and try again.");
        setVerification("error");
      });
      return;
    }

    void fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.paid || typeof result.booking?.reference !== "string") throw new Error(result.error || "Payment could not be verified.");
        setVerifiedReference(result.booking.reference);
        setVerifiedTotal(Number.isFinite(Number(result.booking.total)) ? Number(result.booking.total) : null);
        setVerifiedEmail(typeof result.customerEmail === "string" ? result.customerEmail : "");
        setVerifiedCancellationDeadline(typeof result.booking.free_cancellation_until === "string" ? result.booking.free_cancellation_until : "");
        setBooking({ paymentStatus: "paid", reservationReference: result.booking?.reference });
        setVerification("paid");
      })
      .catch((error: unknown) => {
        setVerificationError(error instanceof Error ? error.message : "We could not verify this payment yet.");
        setVerification("error");
      });
  }, [setBooking]);

  const reference = verifiedReference;

  if (verification === "checking") {
    return (
      <BookingFrame active={3}>
        <section className="card mx-auto max-w-2xl p-10 bg-white text-center space-y-4">
          <Loader2 className="mx-auto animate-spin text-[#7A4E2D]" size={34} aria-hidden="true" />
          <ScrollWipeText as="h1" className="text-2xl font-extrabold text-stone-900">Confirming your Stripe payment…</ScrollWipeText>
          <p className="text-sm text-stone-600">Please wait while we securely confirm your reservation.</p>
        </section>
      </BookingFrame>
    );
  }

  if (verification === "error") {
    return (
      <BookingFrame active={2}>
        <section className="card mx-auto max-w-2xl p-8 bg-white text-center space-y-4">
          <ScrollWipeText as="h1" className="text-2xl font-extrabold text-stone-900">We could not confirm the payment</ScrollWipeText>
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-none p-4" role="alert">{verificationError}</p>
          <Link className="btn-primary inline-flex" href="/booking/payment">Return to payment</Link>
        </section>
      </BookingFrame>
    );
  }

  const price = property && booking.checkIn && booking.checkout
    ? calculatePrice(property, booking.checkIn, booking.checkout, booking.guests)
    : null;
  const totalPaid = verifiedTotal ?? price?.total;
  const emailAddress = verifiedEmail || (typeof booking.guestDetails?.email === "string" ? booking.guestDetails.email : "");

  const downloadConfirmation = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const { createBookingConfirmationPdf } = await import("@/src/lib/bookingConfirmationPdf");
      const guestName = [booking.guestDetails?.firstName, booking.guestDetails?.lastName]
        .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
        .join(" ");
      const pdfBytes = await createBookingConfirmationPdf({
        reference,
        property: property?.name,
        dates: booking.checkIn && booking.checkout ? `${formatDateAu(booking.checkIn)} to ${formatDateAu(booking.checkout)}` : undefined,
        guests: property && booking.checkIn && booking.checkout ? `${booking.guests.adults + booking.guests.children} guests, ${booking.guests.pets} pets` : undefined,
        totalPaid: totalPaid === undefined ? undefined : formatAud(totalPaid),
        guestName: guestName || undefined,
        email: emailAddress || undefined,
        receiptCode: receiptCode(reference),
      });
      const url = URL.createObjectURL(new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Serenity-booking-${reference}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setDownloadError("The confirmation could not be downloaded. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const saveConfirmationImage = async () => {
    if (!cardRef.current || savingImage) return;
    setSavingImage(true);
    setImageError("");
    try {
      await document.fonts.ready;
      const { toPng } = await import("html-to-image");
      const card = cardRef.current;
      const cardBounds = card.getBoundingClientRect();
      const lastContent = card.querySelector<HTMLElement>("[data-image-content-end]");
      const cardStyle = window.getComputedStyle(card);
      const imageHeight = lastContent
        ? Math.ceil(lastContent.getBoundingClientRect().bottom - cardBounds.top + parseFloat(cardStyle.paddingBottom) + parseFloat(cardStyle.borderBottomWidth))
        : Math.ceil(cardBounds.height);
      const dataUrl = await toPng(card, {
        backgroundColor: "#ffffff",
        width: Math.ceil(cardBounds.width),
        height: imageHeight,
        pixelRatio: 2,
        cacheBust: true,
        style: { margin: "0", marginInline: "0", maxWidth: "none" },
        filter: (node) => !(node instanceof HTMLElement && node.dataset.imageExclude === "true"),
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Serenity-booking-${reference}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setImageError("The image could not be saved. Please try again.");
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <BookingFrame active={3}>
      <section ref={cardRef} className="booking-confirmation-card card mx-auto max-w-3xl p-8 bg-white text-center space-y-6">
        <div className="w-16 h-16 rounded-none bg-[#FAF5EF] border border-[#EADCCF] flex items-center justify-center mx-auto text-[#7A4E2D]">
          <CheckCircle2 size={40} />
        </div>

        <div>
          <span className="eyebrow">Reservation Confirmed</span>
          <ScrollWipeText as="h1" className="text-4xl font-extrabold text-stone-900 mt-1">Booking Confirmation #{reference}</ScrollWipeText>
          <p className="text-xs text-stone-500 mt-1">Keep your receipt code as proof of the confirmed booking and payment.</p>
        </div>

        <div className="grid gap-4 text-left sm:grid-cols-2 bg-white p-5 rounded-none border border-stone-200">
          {property && booking.checkIn && booking.checkout && (
            <>
              <Info label="Property" value={property.name} />
              <Info label="Dates" value={`${formatDateAu(booking.checkIn)} to ${formatDateAu(booking.checkout)}`} />
              <Info label="Guests" value={`${booking.guests.adults + booking.guests.children} guests, ${booking.guests.pets} pets`} />
            </>
          )}
          {totalPaid !== undefined && <Info label="Total Paid" value={formatAud(totalPaid)} />}
          {booking.guestDetails && <Info label="Guest Name" value={`${booking.guestDetails.firstName} ${booking.guestDetails.lastName}`} />}
          <Info label="Reservation Ref" value={reference} />
          <Info label="Receipt Code" value={receiptCode(reference)} />
          {emailAddress && <Info label="Email" value={emailAddress} />}
          {verifiedCancellationDeadline && <Info label="Free cancellation deadline" value={`${formatDateAu(verifiedCancellationDeadline)}, 11:59 pm Melbourne time`} />}
        </div>

        <div data-image-content-end className="rounded-none bg-stone-900 text-white p-4 text-left text-xs space-y-1">
          <p className="font-bold text-[#B88A5A] flex items-center gap-1.5">
            <ShieldCheck size={15} /> Access & Check-In Information
          </p>
          <p className="text-stone-300">Exact street address and keypad access codes for key safe will be sent to your email before check-in at 3:00 PM.</p>
        </div>

        <div data-image-exclude="true" className="booking-confirmation-actions flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link className="btn-primary text-xs" href="/">
            Return to Homepage
          </Link>
          <button type="button" className="btn-outline-dark text-xs" onClick={downloadConfirmation} disabled={downloading}>
            <Download size={15} /> {downloading ? "Downloading…" : "Download"}
          </button>
          <button type="button" className="btn-outline-dark text-xs" onClick={saveConfirmationImage} disabled={savingImage}>
            <ImageIcon size={15} /> {savingImage ? "Saving…" : "Save image"}
          </button>
        </div>
        {downloadError && <p data-image-exclude="true" role="alert" className="text-sm text-red-700">{downloadError}</p>}
        {imageError && <p data-image-exclude="true" role="alert" className="text-sm text-red-700">{imageError}</p>}
      </section>
    </BookingFrame>
  );
}

function BookingFrame({ active, children }: { active: number; children: React.ReactNode }) {
  return (
    <div className="booking-flow-page section bg-white pt-8 pb-16">
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
        <ScrollWipeText as="h1" className="text-3xl font-bold text-stone-900">Please select a house and stay dates first.</ScrollWipeText>
        <p className="text-xs text-stone-600">Your reservation session requires a house selection, check-in, and checkout date.</p>
        <Link className="btn-primary inline-flex text-xs" href="/homes">
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
      <span className="text-base font-bold text-stone-900 break-words">{value}</span>
    </div>
  );
}
