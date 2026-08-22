"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { MiniCalendar } from "@/src/components/BookingWidgets";
import { Modal } from "@/src/components/UI";
import Grainient from "@/src/components/ui/Grainient";
import { BookingProvider, useBooking } from "@/src/context/BookingContext";
import type { GuestCounts } from "@/src/lib/booking";
import { formatAud, formatDateAu, hasUnavailableConflict, validateDateRange, validateGuestCapacity } from "@/src/lib/booking";
import type { Property } from "@/src/data/properties";

const parseNonNegativeInteger = (value: string | null) => {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
};

export function PropertiesSearchPage({ properties, today }: { properties: Property[]; today: string }) {
  return (
    <BookingProvider>
      <PropertiesSearchContent properties={properties} today={today} />
    </BookingProvider>
  );
}

function PropertiesSearchContent({ properties, today }: { properties: Property[]; today: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { booking, setBooking } = useBooking();
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>();
  const [calendarSlug, setCalendarSlug] = useState<string | undefined>();
  const [calendarBlockedDates, setCalendarBlockedDates] = useState<string[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarWarning, setCalendarWarning] = useState("");

  const checkIn = searchParams.get("checkIn") || "";
  const checkout = searchParams.get("checkout") || "";
  const guestTotal = parseNonNegativeInteger(searchParams.get("guests"));
  const petTotal = parseNonNegativeInteger(searchParams.get("pets"));
  const initialGuests = useMemo<GuestCounts | undefined>(() => {
    if (guestTotal === null && petTotal === null) return undefined;
    return {
      adults: Math.max(1, guestTotal ?? 1),
      children: 0,
      infants: 0,
      pets: petTotal ?? 0,
    };
  }, [guestTotal, petTotal]);

  const results = useMemo(() => {
    let filtered = [...properties];

    if (checkIn && checkout) {
      filtered = filtered.filter((property) => !hasUnavailableConflict(property, checkIn, checkout));
    }

    if (initialGuests) {
      filtered = filtered.filter((property) => !validateGuestCapacity(property, initialGuests));
    }

    return filtered.sort((a, b) => a.id.localeCompare(b.id));
  }, [checkIn, checkout, initialGuests, properties]);

  const calendarProperty = useMemo(
    () => properties.find((property) => property.slug === calendarSlug),
    [calendarSlug, properties],
  );

  useEffect(() => {
    if (!calendarProperty) return;
    let cancelled = false;

    fetch(`/api/properties/${calendarProperty.slug}/availability`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Live availability could not be checked.");
        if (!cancelled) {
          setCalendarBlockedDates(Array.isArray(data.blockedDates) ? data.blockedDates : calendarProperty.unavailableDates);
          setCalendarWarning(typeof data.warning === "string" ? data.warning : "");
        }
      })
      .catch(() => {
        if (!cancelled) setCalendarWarning("Live availability is temporarily unavailable. Local unavailable nights are still shown.");
      })
      .finally(() => {
        if (!cancelled) setCalendarLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [calendarProperty]);

  const hasDateSearch = Boolean(checkIn && checkout);
  const calendarCheckIn = calendarProperty && booking.propertySlug === calendarProperty.slug ? booking.checkIn : checkIn || undefined;
  const calendarCheckout = calendarProperty && booking.propertySlug === calendarProperty.slug ? booking.checkout : checkout || undefined;
  const calendarDateError = calendarProperty && calendarCheckIn && calendarCheckout
    ? validateDateRange(calendarProperty, calendarCheckIn, calendarCheckout, today, calendarBlockedDates)
    : "";
  const displayName = (name: string) => name.replace(" - Whole", "");

  return (
    <div className="houses-page">
      <section className="houses-results-section">
        <div className="houses-page-container">
          <div className="houses-results-header">
            <div>
              <h2 className="houses-wordmark">SERENITY HOUSES</h2>
            </div>
          </div>

          <div className="houses-results-layout">
            <div className="houses-results-column">
              {results.length ? (
                <div className="houses-results-grid">
                  {results.map((property) => (
                    <div
                      key={property.slug}
                      id={`property-${property.slug}`}
                      className={`houses-result-item ${selectedSlug === property.slug ? "is-selected" : ""}`}
                      onMouseEnter={() => setSelectedSlug(property.slug)}
                      onFocus={() => setSelectedSlug(property.slug)}
                    >
                      <article className="houses-listing-card">
                        <Link href={`/properties/${property.slug}`} className="houses-listing-image group">
                          {property.featuredImage ? <Image src={property.featuredImage} alt={`${displayName(property.name)} accommodation in Pakenham`} fill sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 30vw" className="object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="absolute inset-0 bg-[#E8DED6]" aria-hidden="true" />}
                          <div className="houses-listing-image-shade" aria-hidden="true" />
                        </Link>

                        <div className="houses-listing-body">
                          <div className="houses-listing-title-row">
                            <div>
                              <h3><Link href={`/properties/${property.slug}`}>{displayName(property.name)}</Link></h3>
                            </div>
                            <Link href={`/properties/${property.slug}`} aria-label={`View ${displayName(property.name)}`} className="houses-arrow-link"><ArrowUpRight size={18} /></Link>
                          </div>
                          <p className="houses-listing-description">{property.shortDescription}</p>
                          <div className="houses-listing-footer">
                            <Link href={`/properties/${property.slug}#availability`} className="houses-view-link">Check availability <ArrowUpRight size={15} /></Link>
                          </div>
                        </div>
                      </article>
                      {hasDateSearch && <p className="houses-availability-note">Available for your selected dates</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="houses-empty-state">
                  <h2>No houses are available for those dates.</h2>
                  <p>Try different dates, fewer guests, or clear the search to see every Serenity house again.</p>
                  <Link href="/houses" className="houses-view-link">View all houses <ArrowUpRight size={15} /></Link>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      <section className="houses-closing-section">
        <div className="houses-closing-background" aria-hidden="true">
          <div className="houses-closing-base" />
          <div className="houses-closing-grainient"><Grainient color1="#D9C4B5" color2="#8E6E5B" color3="#2D2521" timeSpeed={0.12} colorBalance={0.08} warpStrength={1.25} warpFrequency={3.5} warpSpeed={1.5} blendSoftness={0.16} grainAmount={0.045} contrast={1.15} saturation={0.82} /></div>
          <div className="houses-closing-overlay" />
        </div>
        <div className="houses-page-container houses-closing-grid">
          <div><h2>One booking.<br /><em>Three ways to settle in.</em></h2></div>
          <div className="houses-closing-copy"><p>Stay in one home for a quiet getaway, bring your family together, or keep a whole project team nearby with adjacent houses and direct support from our local team.</p><Link href="/corporate-stays" className="houses-view-link">Corporate stay <ArrowUpRight size={15} /></Link></div>
        </div>
      </section>

      {calendarProperty && (
        <Modal title={`Select dates · ${calendarProperty.name}`} open onClose={() => setCalendarSlug(undefined)}>
          <div className="mb-5 flex flex-col justify-between gap-4 rounded-none border border-[#EADCCF] bg-[#FAF5EF] p-4 sm:flex-row sm:items-center sm:p-5">
            <div>
              <p className="eyebrow flex items-center gap-2 text-xs"><CalendarDays size={15} /> Choose your stay dates</p>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">Select check-in and checkout to see the nightly rate and confirm availability for this house.</p>
            </div>
            <p className="shrink-0 text-lg font-extrabold text-stone-900">{formatAud(calendarProperty.nightlyPrice)} <span className="text-xs font-semibold text-stone-500">AUD / night</span></p>
          </div>

          <MiniCalendar
            key={calendarProperty.slug}
            property={calendarProperty}
            today={today}
            checkIn={calendarCheckIn}
            checkout={calendarCheckout}
            blockedDates={calendarBlockedDates}
            availabilityLoading={calendarLoading}
            onSelect={(nextCheckIn, nextCheckout) => setBooking({ propertySlug: calendarProperty.slug, checkIn: nextCheckIn, checkout: nextCheckout })}
          />

          {calendarWarning && <p className="mt-3 text-xs font-semibold text-stone-600">{calendarWarning}</p>}
          {calendarCheckIn && calendarCheckout && !calendarDateError && (
            <div className="mt-5 flex flex-col justify-between gap-4 rounded-none border border-[#B8D0C0] bg-[#E6EFE9] p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-extrabold text-[#2F5D4B]">Dates selected</p>
                <p className="mt-1 text-sm text-[#2F5D4B]">{formatDateAu(calendarCheckIn)} – {formatDateAu(calendarCheckout)}</p>
              </div>
              <button type="button" className="btn-primary inline-flex justify-center whitespace-nowrap" onClick={() => router.push("/booking")}>Continue to booking</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
