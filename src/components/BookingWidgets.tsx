"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BedDouble, Building2, CalendarDays, Car, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Dog, MapPin, Minus, Plus, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Property } from "@/src/data/properties";
import { properties } from "@/src/data/properties";
import { useBooking } from "@/src/context/BookingContext";
import { addDays, calculatePrice, dateToIso, defaultGuests, formatAud, formatDateAu, getNightlyPrice, GuestCounts, nightsBetween, totalStayingGuests, validateDateRange, validateGuestCapacity } from "@/src/lib/booking";
import { AU_LOCALE, AU_TIME_ZONE, formatAuNumber } from "@/src/lib/localization";

export function GuestSelector({ value, onChange, maxGuests = 12, embedded = false }: { value: GuestCounts; onChange: (value: GuestCounts) => void; maxGuests?: number; embedded?: boolean }) {
  const capacityReached = totalStayingGuests(value) >= maxGuests;
  const update = (key: keyof GuestCounts, delta: number) => {
    const next = { ...value, [key]: Math.max(key === "adults" ? 1 : 0, value[key] + delta) };
    if ((key === "adults" || key === "children") && totalStayingGuests(next) > maxGuests) return;
    onChange(next);
  };
  return (
    <div className={embedded ? "" : "rounded-none border border-stone-200 bg-white p-4 shadow-lg"}>
      {([
        ["adults", "Adults", "Ages 13+"],
        ["children", "Children", "Ages 2-12"],
        ["infants", "Infants", "Under 2"],
        ["pets", "Pets", "Declared before arrival"],
      ] as [keyof GuestCounts, string, string][]).map(([key, label, help]) => (
        <div key={key} className="flex items-center justify-between border-b border-stone-100 py-3 last:border-0">
          <span>
            <span className="block font-medium text-stone-900">{label}</span>
            <span className="text-xs text-stone-500">{help}</span>
          </span>
          <span className="flex items-center gap-3">
            <button type="button" className="counter-button" aria-label={`Decrease ${label}`} onClick={() => update(key, -1)}>
              <Minus size={14} />
            </button>
            <span className="w-5 text-center font-semibold tabular-nums text-stone-900">{formatAuNumber(value[key])}</span>
            <button type="button" className="counter-button" aria-label={`Increase ${label}`} onClick={() => update(key, 1)}>
              <Plus size={14} />
            </button>
          </span>
        </div>
      ))}
      {capacityReached && <p className="mt-2 text-xs font-semibold text-amber-800">Maximum guest capacity reached for this house.</p>}
    </div>
  );
}

export function SearchBar({
  compact = false,
  today,
  initialCheckIn,
  initialCheckout,
  initialGuests,
  submitLabel = "Search",
}: {
  compact?: boolean;
  today: string;
  initialCheckIn?: string;
  initialCheckout?: string;
  initialGuests?: GuestCounts;
  submitLabel?: string;
}) {
  const router = useRouter();
  const { booking, setBooking } = useBooking();
  const [destination, setDestination] = useState("Pakenham VIC");
  const [checkIn, setCheckIn] = useState(initialCheckIn ?? booking.checkIn ?? "");
  const [checkout, setCheckout] = useState(initialCheckout ?? booking.checkout ?? "");
  const [guests, setGuests] = useState(initialGuests ?? booking.guests ?? defaultGuests);
  const [showGuests, setShowGuests] = useState(false);
  const [dateError, setDateError] = useState("");

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckIn(newCheckIn);
    setDateError("");
    if (!checkout || checkout <= newCheckIn) {
      setCheckout(addDays(newCheckIn, 1));
    }
  };

  const handleCheckoutChange = (newCheckout: string) => {
    if (checkIn && newCheckout <= checkIn) {
      setDateError("Checkout date must be after check-in.");
      setCheckout(addDays(checkIn, 1));
      return;
    }
    setDateError("");
    setCheckout(newCheckout);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (checkIn && checkout && checkout <= checkIn) {
      setDateError("Checkout date must be after check-in.");
      return;
    }
    setBooking({ checkIn, checkout, guests });
    const params = new URLSearchParams({
      destination,
      checkIn,
      checkout,
      guests: String(totalStayingGuests(guests)),
      pets: String(guests.pets),
    });
    router.push(`/houses?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className={`search-panel-luxury flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full ${compact ? "search-panel-compact" : ""}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-center gap-2.5 flex-1 min-w-0">
        {/* 1. Where */}
        <div className="search-box border border-stone-200 hover:border-stone-400 focus-within:border-[#B7664E] rounded-none p-2.5 px-3.5 bg-white transition-all min-w-0">
          <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-stone-500 cursor-pointer">Where</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Select region(s)"
            className="w-full text-xs sm:text-sm font-semibold text-stone-900 bg-transparent border-none outline-none p-0 mt-0.5 truncate"
          />
        </div>

        {/* 2. Check in */}
        <div className="search-box relative border border-stone-200 hover:border-stone-400 focus-within:border-[#B7664E] rounded-none p-2.5 px-3.5 bg-white transition-all cursor-pointer min-w-0">
          <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-stone-500">Check in</span>
          <div className="text-xs sm:text-sm font-semibold text-stone-900 truncate mt-0.5">
            {checkIn ? formatDateAu(checkIn) : "Select date"}
          </div>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => handleCheckInChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            aria-label="Check in date"
          />
        </div>

        {/* 3. Check out */}
        <div className="search-box relative border border-stone-200 hover:border-stone-400 focus-within:border-[#B7664E] rounded-none p-2.5 px-3.5 bg-white transition-all cursor-pointer min-w-0">
          <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-stone-500">Check out</span>
          <div className="text-xs sm:text-sm font-semibold text-stone-900 truncate mt-0.5">
            {checkout ? formatDateAu(checkout) : "Select date"}
          </div>
          <input
            type="date"
            min={checkIn ? addDays(checkIn, 1) : today}
            value={checkout}
            onChange={(e) => handleCheckoutChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            aria-label="Check out date"
          />
        </div>

        {/* 4. Who */}
        <div className="search-box relative border border-stone-200 hover:border-stone-400 focus-within:border-[#B7664E] rounded-none p-2.5 px-3.5 bg-white transition-all cursor-pointer min-w-0">
          <button
            type="button"
            className="w-full text-left cursor-pointer border-none outline-none bg-transparent p-0"
            onClick={() => setShowGuests((open) => !open)}
            aria-expanded={showGuests}
          >
            <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-stone-500">Who</span>
            <div className="text-xs sm:text-sm font-semibold text-stone-900 truncate mt-0.5">
              {totalStayingGuests(guests) === 0
                ? "Add guests"
                : `${totalStayingGuests(guests)} guest${totalStayingGuests(guests) !== 1 ? "s" : ""}${guests.pets ? `, ${guests.pets} pet` : ""}`}
            </div>
          </button>
          {showGuests && (
            <div className="absolute right-0 z-30 mt-3 w-80 max-w-[calc(100vw-2rem)] shadow-2xl">
              <GuestSelector value={guests} onChange={setGuests} />
            </div>
          )}
        </div>
      </div>

      {/* 5. Search Button */}
      <button
        type="submit"
        className="w-full lg:w-auto rounded-none bg-[#B7664E] hover:bg-[#9C523C] active:bg-[#854330] text-white font-bold text-sm sm:text-base px-8 py-3.5 transition-all shadow-md hover:shadow-lg cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
      >
        <span>{submitLabel}</span>
      </button>

      {dateError && (
        <div className="col-span-full w-full text-xs font-semibold text-[#B7664E] mt-1 px-1">
          {dateError}
        </div>
      )}
    </form>
  );
}

export function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="property-card group flex flex-col justify-between">
      <div>
        <Link href={`/properties/${property.slug}`} className="relative block h-64 overflow-hidden">
          {property.featuredImage ? <Image
            src={property.featuredImage}
            alt={`${property.name} accommodation in Pakenham`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          /> : <div className="absolute inset-0 bg-[#E8DED6]" aria-label="Property photo not available" />}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <span className="property-badge shadow-sm">
              <Building2 size={13} /> Beside Serenity 7, 9 & 11
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <span className="rounded-none bg-stone-900/80 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white flex items-center gap-1 shadow-sm">
              <Dog size={13} className="text-[#B88A5A]" /> Pet-friendly
            </span>
          </div>
        </Link>

        <div className="property-card-body">
          <div>
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[#7A4E2D]">
              {property.propertyType} · Pakenham VIC
            </span>
            <h3 className="mt-1 text-xl font-bold text-stone-900 group-hover:text-[#7A4E2D] transition-colors">
              <Link href={`/properties/${property.slug}`}>{property.name}</Link>
            </h3>
            <p className="mt-1 text-xs text-stone-500 flex items-center gap-1">
              <MapPin size={13} className="text-stone-600" /> {property.location}
            </p>
          </div>

          <p className="line-clamp-2 text-sm leading-relaxed text-stone-600">
            {property.shortDescription}
          </p>

          <div className="property-stats">
            <span><Users className="mx-auto mb-1 text-stone-500" size={15} />{formatAuNumber(property.maxGuests)} guests</span>
            <span><BedDouble className="mx-auto mb-1 text-stone-500" size={15} />{formatAuNumber(property.bedrooms)} bd</span>
            <span><BedDouble className="mx-auto mb-1 text-stone-500" size={15} />{formatAuNumber(property.beds)} beds</span>
            <span><Car className="mx-auto mb-1 text-stone-500" size={15} />{formatAuNumber(property.bathrooms)} bath</span>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-100 p-4 bg-[#FAF8F5] flex items-center justify-between">
        <div>
          <span className="text-[0.7rem] font-bold uppercase tracking-wider text-stone-600 block">
            Direct rate AUD
          </span>
          <p className="text-lg font-bold text-stone-900">
            {formatAud(property.nightlyPrice)} <span className="text-xs font-normal text-stone-500">/ night</span>
          </p>
        </div>
        <Link href={`/properties/${property.slug}`} className="btn-secondary text-xs px-4">
          View House
        </Link>
      </div>
    </article>
  );
}

export function PriceBreakdownView({ property, checkIn, checkout, guests, corporate = false, price: providedPrice }: { property: Property; checkIn?: string; checkout?: string; guests: GuestCounts; corporate?: boolean; price?: ReturnType<typeof calculatePrice> }) {
  if (!checkIn || !checkout) {
    return (
      <div className="booking-price-breakdown space-y-2 text-base">
        <div className="flex justify-between gap-4 text-stone-600">
          <span>Nightly rate</span>
          <span className="font-semibold text-stone-900">{formatAud(property.nightlyPrice)}</span>
        </div>
        <p className="text-sm leading-relaxed text-stone-500">Select check-in and checkout dates to see the full AUD total, fees, GST, and discounts.</p>
      </div>
    );
  }

  const price = providedPrice ?? calculatePrice(property, checkIn, checkout, guests, corporate);
  const rows = [
    [price.nightlyRateSummary, price.nightlySubtotal],
    ["Cleaning fee", price.cleaningFee],
    ["Pet fee", price.petFee],
    ["Extra guest fee", price.extraGuestFee],
    [price.discountLabel || "Longer-stay discount", -(price.discount - (price.promotionDiscount ?? 0))],
    [price.promotionLabel || "Voucher discount", -(price.promotionDiscount ?? 0)],
    ["GST estimate (10%)", price.tax],
  ].filter(([, amount]) => amount !== 0);

  return (
    <div className="booking-price-breakdown space-y-3 text-base">
      {rows.map(([label, amount]) => (
        <div key={label as string} className="flex justify-between gap-4 text-stone-600">
          <span>{label}</span>
          <span className="font-semibold text-stone-900">{formatAud(Number(amount))}</span>
        </div>
      ))}
      <div className="booking-total flex justify-between border-t border-stone-200 pt-3 font-bold text-stone-900">
        <span>Total AUD</span>
        <span className="text-[#7A4E2D]">{formatAud(price.total)}</span>
      </div>
    </div>
  );
}

export function MiniCalendar({ property, checkIn, checkout, today, onSelect, onCheckInSelect, blockedDates = [], availabilityLoading = false, singleMonth = false, showSelectionHeader = true, showHint = true }: { property: Property; checkIn?: string; checkout?: string; today: string; onSelect: (checkIn: string, checkout: string) => void; onCheckInSelect?: (checkIn: string) => void; blockedDates?: string[]; availabilityLoading?: boolean; singleMonth?: boolean; showSelectionHeader?: boolean; showHint?: boolean }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const todayDate = new Date(`${today}T00:00:00Z`);
  const base = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + monthOffset, 1));
  const months = singleMonth ? [base] : [base, new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1))];
  const [pendingStart, setPendingStart] = useState(checkIn ?? "");
  const [message, setMessage] = useState("");

  /* The calendar can be updated by the separate availability calendar, so its local selection must follow the booking context. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPendingStart(checkIn ?? "");
    setMessage("");
  }, [checkIn]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const pick = (iso: string) => {
    if (!pendingStart || checkout || iso <= pendingStart) {
      setPendingStart(iso);
      setMessage("");
      onCheckInSelect?.(iso);
      return;
    }
    const error = validateDateRange(property, pendingStart, iso, today, blockedDates);
    if (error) {
      setMessage(error);
      return;
    }
    onSelect(pendingStart, iso);
    setPendingStart("");
    setMessage("");
  };

  return (
    <div className={`rounded-none border border-stone-200 bg-white shadow-sm ${singleMonth ? "p-4" : "p-5"}`}>
      <div className="mb-4 flex items-center justify-between">
        <button className="icon-button" type="button" aria-label="Previous month" onClick={() => setMonthOffset((value) => Math.max(0, value - 1))}>
          <ChevronLeft size={18} />
        </button>
        {showSelectionHeader ? <span className="text-center font-bold text-stone-900">Select check-in & checkout dates</span> : <span className="sr-only">Select check-in and checkout dates</span>}
        <button className="icon-button" type="button" aria-label="Next month" onClick={() => setMonthOffset((value) => value + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className={`grid gap-6 ${singleMonth ? "" : "md:grid-cols-2"}`}>
        {months.map((month) => (
          <Month key={month.toISOString()} month={month} property={property} today={today} checkIn={pendingStart || checkIn} checkout={checkout} blockedDates={blockedDates} onPick={pick} />
        ))}
      </div>
      {availabilityLoading && <p className="mt-4 text-sm font-semibold text-stone-600" role="status">Checking live availability…</p>}
      {message && <p className="mt-4 rounded-none border border-[#E7BDB4] bg-[#FFF6F3] px-3 py-2 text-sm font-semibold text-[#8A3325]" role="alert">{message}</p>}
      {showHint && <p className="mt-4 text-xs text-stone-500">Unavailable nights are disabled. Select a check-in date, then a checkout date.</p>}
    </div>
  );
}

function Month({ month, property, today, checkIn, checkout, blockedDates, onPick }: { month: Date; property: Property; today: string; checkIn?: string; checkout?: string; blockedDates: string[]; onPick: (iso: string) => void }) {
  const days = useMemo(() => {
    const result: (string | null)[] = Array(month.getUTCDay()).fill(null);
    const count = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
    for (let day = 1; day <= count; day++) result.push(dateToIso(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day))));
    return result;
  }, [month]);
  const blocked = new Set([...property.unavailableDates, ...blockedDates]);

  return (
    <div>
      <h3 className="mb-3 text-center font-bold text-stone-800">{month.toLocaleDateString(AU_LOCALE, { month: "long", year: "numeric", timeZone: AU_TIME_ZONE })}</h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-stone-600">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, index) => (
          <span key={`${d}-${index}`}>{d}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((iso, index) => {
          const dateValidation = iso && checkIn && !checkout && iso > checkIn ? validateDateRange(property, checkIn, iso, today, blockedDates) : "";
          const disabled = !iso || iso < today || iso > addDays(today, property.maximumAdvanceBookingDays) || blocked.has(iso) || (!property.sameDayBookingAllowed && iso === today) || Boolean(dateValidation);
          const selected = iso && (iso === checkIn || iso === checkout);
          const inRange = Boolean(iso && checkIn && checkout && iso > checkIn && iso < checkout);
          const rangeStart = Boolean(checkIn && checkout && iso === checkIn);
          const rangeEnd = Boolean(checkIn && checkout && iso === checkout);
          const minimumStayNotMet = Boolean(checkIn && !checkout && iso && iso > checkIn && nightsBetween(checkIn, iso) < property.minimumStay);
          const unavailable = disabled && !minimumStayNotMet;
          const dayLabel = blocked.has(iso ?? "") ? ", unavailable" : minimumStayNotMet ? `, minimum stay is ${property.minimumStay} nights` : `, ${formatAud(getNightlyPrice(property, iso ?? undefined))} per night`;
          return iso ? (
            <span key={iso} className={`calendar-day-cell ${inRange ? "in-range" : ""} ${rangeStart ? "range-start" : ""} ${rangeEnd ? "range-end" : ""}`}>
              <button type="button" disabled={disabled} aria-label={`${formatDateAu(iso)}${dayLabel}`} title={blocked.has(iso) ? "Unavailable" : minimumStayNotMet ? `${property.minimumStay}-night minimum stay` : dateValidation || formatAud(getNightlyPrice(property, iso))} onClick={() => onPick(iso)} className={`calendar-day ${selected ? "selected" : ""} ${unavailable ? "disabled" : ""} ${minimumStayNotMet ? "minimum-stay" : ""}`}>
                <span>{formatAuNumber(Number(iso.slice(-2)))}</span>
                {!blocked.has(iso) && <span className="calendar-day-price">{formatAud(getNightlyPrice(property, iso))}</span>}
              </button>
            </span>
          ) : (
            <span key={index} className="calendar-day-cell" aria-hidden="true" />
          );
        })}
      </div>
    </div>
  );
}

export function BookingCard({ property, today, blockedDates = [], availabilityLoading = false }: { property: Property; today: string; blockedDates?: string[]; availabilityLoading?: boolean }) {
  const router = useRouter();
  const { booking, setBooking } = useBooking();
  const bookingCardRef = useRef<HTMLElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [calendarResetKey, setCalendarResetKey] = useState(0);
  const [reserveAttempted, setReserveAttempted] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 16, left: 16, width: 672 });
  const guests = booking.guests ?? defaultGuests;
  const checkIn = booking.checkIn ?? "";
  const checkout = booking.checkout ?? "";
  const dateError = validateDateRange(property, checkIn, checkout, today, blockedDates);
  const guestError = validateGuestCapacity(property, guests);

  useEffect(() => {
    if (!calendarOpen && !guestsOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (bookingCardRef.current && !bookingCardRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
        setGuestsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCalendarOpen(false);
        setGuestsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [calendarOpen, guestsOpen]);

  useEffect(() => {
    if (!calendarOpen) return;

    const updateCalendarPosition = () => {
      const anchor = bookingCardRef.current?.querySelector<HTMLElement>(".booking-date-picker");
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const width = Math.min(672, Math.max(280, window.innerWidth - 32));
      const estimatedHeight = window.innerWidth <= 640 ? 680 : 600;
      const openAbove = rect.bottom + 12 + estimatedHeight > window.innerHeight && rect.top - 12 - estimatedHeight >= 16;
      const top = openAbove
        ? Math.max(16, rect.top - estimatedHeight - 12)
        : Math.min(rect.bottom + 12, Math.max(16, window.innerHeight - estimatedHeight - 16));
      const left = Math.min(Math.max(16, rect.right - width), Math.max(16, window.innerWidth - width - 16));
      setCalendarPosition({ top, left, width });
    };

    updateCalendarPosition();
    window.addEventListener("resize", updateCalendarPosition);
    window.addEventListener("scroll", updateCalendarPosition, { passive: true });
    return () => {
      window.removeEventListener("resize", updateCalendarPosition);
      window.removeEventListener("scroll", updateCalendarPosition);
    };
  }, [calendarOpen]);

  const reserve = () => {
    setReserveAttempted(true);
    if (dateError || guestError) return;
    setBooking({ propertySlug: property.slug, checkIn, checkout, guests });
    router.push("/booking");
  };

  return (
    <aside ref={bookingCardRef} className="card p-6 shadow-xl border border-stone-200">
      <div className="mb-5 flex items-end justify-between border-b border-stone-100 pb-4">
        <div>
        <span className="booking-nightly-price text-3xl font-bold text-stone-900">{formatAud(property.nightlyPrice)}</span>{" "}
          <span className="text-xs font-normal text-stone-500">AUD / night</span>
        </div>
        <span className="rounded-none bg-[#FAF5EF] border border-[#EADCCF] px-2.5 py-1 text-xs font-bold text-[#7A4E2D]">
          Direct Rate
        </span>
      </div>

      <div className="booking-date-picker">
        <div className="grid grid-cols-2 overflow-hidden rounded-none border border-stone-200 bg-white">
          <button
            type="button"
            className={`booking-date-trigger border-r border-stone-200 text-left ${calendarOpen ? "is-active" : ""}`}
            onClick={() => { setCalendarOpen(true); setGuestsOpen(false); }}
            aria-expanded={calendarOpen}
            aria-controls={`booking-calendar-${property.slug}`}
          >
            <span className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase text-stone-500"><CalendarDays size={14} /> Check-in</span>
            <strong className="mt-1 block text-sm font-semibold text-stone-900">{checkIn ? formatDateAu(checkIn) : "Add date"}</strong>
          </button>
          <button
            type="button"
            className={`booking-date-trigger text-left ${calendarOpen ? "is-active" : ""}`}
            onClick={() => { setCalendarOpen(true); setGuestsOpen(false); }}
            aria-expanded={calendarOpen}
            aria-controls={`booking-calendar-${property.slug}`}
          >
            <span className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase text-stone-500"><CalendarDays size={14} /> Checkout</span>
            <strong className="mt-1 block text-sm font-semibold text-stone-900">{checkout ? formatDateAu(checkout) : "Add date"}</strong>
          </button>
        </div>

        {calendarOpen && (
          <div id={`booking-calendar-${property.slug}`} className="booking-card-calendar" style={{ top: `${calendarPosition.top}px`, left: `${calendarPosition.left}px`, width: `${calendarPosition.width}px` }}>
            <div className="booking-calendar-popover">
              <div className="booking-calendar-popover-header">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Select dates</h3>
                  <p className="mt-1 text-sm text-stone-500">Add your travel dates for exact pricing</p>
                </div>
                <div className="booking-calendar-tabs">
                  <button type="button" className={`booking-calendar-tab ${!checkIn ? "is-active" : ""}`} onClick={() => setCalendarOpen(true)}>
                    <span>Check-in</span>
                    <strong>{checkIn ? formatDateAu(checkIn) : "Add date"}</strong>
                  </button>
                  <button type="button" className={`booking-calendar-tab ${checkIn ? "is-active" : ""}`} onClick={() => setCalendarOpen(true)}>
                    <span>Checkout</span>
                    <strong>{checkout ? formatDateAu(checkout) : "Add date"}</strong>
                  </button>
                </div>
              </div>

              <MiniCalendar
                key={`${property.slug}-${calendarResetKey}`}
                property={property}
                today={today}
                checkIn={checkIn}
                checkout={checkout}
                blockedDates={blockedDates}
                availabilityLoading={availabilityLoading}
                onCheckInSelect={(nextCheckIn) => setBooking({ propertySlug: property.slug, checkIn: nextCheckIn, checkout: "" })}
                showSelectionHeader={false}
                showHint={false}
                onSelect={(nextCheckIn, nextCheckout) => {
                  setBooking({ propertySlug: property.slug, checkIn: nextCheckIn, checkout: nextCheckout });
                  setReserveAttempted(false);
                  setCalendarOpen(false);
                }}
              />

              <div className="booking-calendar-popover-footer">
                <button type="button" className="text-sm font-semibold text-stone-700 underline-offset-4 hover:underline" onClick={() => { setBooking({ propertySlug: property.slug, checkIn: "", checkout: "" }); setCalendarResetKey((value) => value + 1); }}>
                  Clear dates
                </button>
                <button type="button" className="btn-primary min-h-9 px-4 text-sm" onClick={() => setCalendarOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        <div className="booking-guest-picker mt-3">
          <button
            type="button"
            className={`booking-guests-trigger ${guestsOpen ? "is-active" : ""}`}
            onClick={() => { setGuestsOpen((open) => !open); setCalendarOpen(false); }}
            aria-expanded={guestsOpen}
            aria-controls={`booking-guests-${property.slug}`}
          >
            <span>
              <span className="block text-[0.7rem] font-bold uppercase tracking-wide text-stone-500">Guests</span>
              <strong className="mt-1 block text-sm font-semibold text-stone-900">{totalStayingGuests(guests)} guest{totalStayingGuests(guests) === 1 ? "" : "s"}{guests.pets ? ` · ${guests.pets} pet${guests.pets === 1 ? "" : "s"}` : ""}</strong>
            </span>
            {guestsOpen ? <ChevronUp size={19} aria-hidden="true" /> : <ChevronDown size={19} aria-hidden="true" />}
          </button>

          {guestsOpen && (
            <div id={`booking-guests-${property.slug}`} className="booking-guests-popover">
              <GuestSelector value={guests} onChange={(value) => setBooking({ propertySlug: property.slug, checkIn, checkout, guests: value })} maxGuests={property.maxGuests} embedded />
              <p className="mt-3 text-sm leading-relaxed text-stone-600">This place has a maximum of {property.maxGuests} guests, not including infants. If you are bringing more than {property.maximumPets} pets, please let your host know.</p>
              <button type="button" className="mt-4 block w-full text-right text-sm font-semibold text-stone-800 underline-offset-4 hover:underline" onClick={() => setGuestsOpen(false)}>Close</button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-stone-100 pt-4">
        <PriceBreakdownView property={property} checkIn={checkIn} checkout={checkout} guests={guests} />
      </div>

      {availabilityLoading && <p className="mt-3 text-sm font-semibold text-stone-600" role="status">Checking live availability…</p>}
      {reserveAttempted && (dateError || guestError) && <p className="mt-3 rounded-none border border-[#E7BDB4] bg-[#FFF6F3] p-3 text-sm font-semibold text-[#8A3325]" role="alert">{dateError || guestError}</p>}

      <button className="btn-primary mt-5 w-full justify-center text-base" disabled={Boolean(dateError || guestError || availabilityLoading)} onClick={reserve}>
        Reserve House
      </button>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-stone-500">
        <ShieldCheck size={14} className="text-[#7A4E2D]" /> Direct booking · No login required
      </div>
    </aside>
  );
}

export function RelatedHouses({ currentSlug, properties: relatedProperties = properties }: { currentSlug: string; properties?: Property[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {relatedProperties
        .filter((property) => property.slug !== currentSlug)
        .map((property) => (
          <PropertyCard key={property.slug} property={property} />
        ))}
    </div>
  );
}
