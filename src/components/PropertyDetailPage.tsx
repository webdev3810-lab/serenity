"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Bath, BedDouble, BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, Dog, Home, Images, KeyRound, MapPin, ShieldCheck, Users, Building2, X } from "lucide-react";
import { ApproximateMap } from "@/src/components/ApproximateMap";
import type { Property } from "@/src/data/properties";
import { BookingCard, MiniCalendar, RelatedHouses } from "@/src/components/BookingWidgets";
import { Drawer, Modal } from "@/src/components/UI";
import { calculatePrice, defaultGuests, formatAud, validateDateRange } from "@/src/lib/booking";
import { formatAuNumber } from "@/src/lib/localization";
import { useBooking } from "@/src/context/BookingContext";

const isRemotePreviewImage = (src: string) => src.includes("a0.muscache.com");

function PhotoTour({ property, open, onClose }: { property: Property; open: boolean; onClose: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const images = property.images.filter((image) => image.src && !image.src.includes("a0.muscache.com") && !image.src.includes("images.unsplash.com"));

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (lightboxOpen) setLightboxOpen(false);
        else onClose();
      }
      if (lightboxOpen && event.key === "ArrowLeft") {
        setActiveIndex((current) => (current - 1 + images.length) % images.length);
      }
      if (lightboxOpen && event.key === "ArrowRight") {
        setActiveIndex((current) => (current + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, lightboxOpen, onClose, open]);

  if (!open) return null;

  if (!images.length) return null;

  const activeImage = images[activeIndex % images.length];
  const showPrevious = () => setActiveIndex((current) => (current - 1 + images.length) % images.length);
  const showNext = () => setActiveIndex((current) => (current + 1) % images.length);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#1E1916] text-[#F7F4F1]" role="dialog" aria-modal="true" aria-labelledby="photo-tour-title">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#1E1916]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center gap-2 rounded-none border border-white/20 px-4 text-sm font-bold text-[#F7F4F1] transition hover:border-white/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2C0B4]" aria-label="Close photo tour">
            <X size={18} />
            <span className="hidden sm:inline">Close</span>
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#D2C0B4]">Photo tour</p>
            <h2 id="photo-tour-title" className="mt-1 truncate text-base font-bold sm:text-lg">{property.name}</h2>
          </div>
          <div className="min-w-[78px] text-right text-xs font-semibold text-white/65 sm:min-w-[110px]">
            {images.length} photos
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#D2C0B4]">Explore the house</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">Browse every room, outdoor area and detail in one calm, full-screen gallery.</p>
          </div>
          <p className="text-xs font-semibold text-white/55">Select a photo to view it larger</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <button
              key={image.src + index}
              type="button"
              onClick={() => { setActiveIndex(index); setLightboxOpen(true); }}
              className={`group relative overflow-hidden rounded-none bg-[#2B2420] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2C0B4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1916] ${index === 0 ? "col-span-2 row-span-2 aspect-square lg:aspect-auto lg:min-h-[620px]" : "aspect-[4/3]"}`}
              aria-label={`View photo ${index + 1} of ${images.length}: ${image.alt}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                unoptimized={isRemotePreviewImage(image.src)}
                referrerPolicy={isRemotePreviewImage(image.src) ? "no-referrer" : undefined}
                sizes={index === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
                className="object-cover transition duration-500 group-hover:scale-[1.03] group-hover:brightness-90"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1E1916]/75 to-transparent px-3 pb-3 pt-10 text-left text-[0.68rem] font-semibold text-white/90 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                Photo {index + 1} of {images.length}
              </span>
              {index === 0 && <span className="absolute left-3 top-3 rounded-none bg-[#1E1916]/75 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#F7F4F1] backdrop-blur-sm">Featured view</span>}
            </button>
          ))}
        </div>
      </main>

      {lightboxOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1E1916]/[.98] p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Photo ${activeIndex + 1} of ${images.length}`} onClick={() => setLightboxOpen(false)}>
          <div className="flex h-full w-full max-w-7xl flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 pb-4 text-sm">
              <p className="font-semibold text-white/75">Photo {activeIndex + 1} of {images.length}</p>
              <button type="button" onClick={() => setLightboxOpen(false)} className="inline-flex min-h-11 items-center gap-2 rounded-none border border-white/20 px-4 font-bold text-[#F7F4F1] transition hover:border-white/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2C0B4]" aria-label="Close enlarged photo">
                <X size={18} /> <span className="hidden sm:inline">Close</span>
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center gap-2 sm:gap-5">
              <button type="button" onClick={showPrevious} className="z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-none border border-white/25 bg-[#2B2420]/80 text-[#F7F4F1] transition hover:bg-[#5A463A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2C0B4]" aria-label="Previous photo">
                <ChevronLeft size={22} />
              </button>
              <div className="relative flex h-full min-h-[260px] min-w-0 flex-1 items-center justify-center">
                <Image
                  src={activeImage.src}
                  alt={activeImage.alt}
                  width={1600}
                  height={1200}
                  unoptimized={isRemotePreviewImage(activeImage.src)}
                  referrerPolicy={isRemotePreviewImage(activeImage.src) ? "no-referrer" : undefined}
                  sizes="(max-width: 768px) 88vw, 78vw"
                  className="max-h-full w-auto max-w-full rounded-none object-contain shadow-2xl"
                />
              </div>
              <button type="button" onClick={showNext} className="z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-none border border-white/25 bg-[#2B2420]/80 text-[#F7F4F1] transition hover:bg-[#5A463A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2C0B4]" aria-label="Next photo">
                <ChevronRight size={22} />
              </button>
            </div>
            <p className="pt-4 text-center text-xs text-white/60">Use the arrow buttons or keyboard arrows to browse</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function PropertyDetailPage({ property, relatedProperties, today }: { property: Property; relatedProperties?: Property[]; today: string }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>(property.unavailableDates);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const { booking, setBooking } = useBooking();
  const visibleImages = property.images.filter((image) => image.src && !image.src.includes("a0.muscache.com") && !image.src.includes("images.unsplash.com"));
  const price = calculatePrice(property, booking.checkIn, booking.checkout, booking.guests ?? defaultGuests);
  const mobileDisplayPrice = price.nights > 0 ? price.total : property.nightlyPrice;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/properties/${property.slug}/availability`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Availability could not be checked.");
        if (!cancelled) {
          setBlockedDates(Array.isArray(data.blockedDates) ? data.blockedDates : property.unavailableDates);
          setAvailabilityError(data.warning || "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBlockedDates(property.unavailableDates);
          setAvailabilityError("Live availability is temporarily unavailable. Local unavailable nights are still shown.");
        }
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
    return () => { cancelled = true; };
  }, [property.slug, property.unavailableDates]);

  const vacationRentalJsonLd = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: property.name,
    containsPlace: { "@type": "Accommodation", occupancy: { "@type": "QuantitativeValue", value: property.maxGuests } },
    address: { "@type": "PostalAddress", addressLocality: "Pakenham", addressRegion: "VIC", addressCountry: "AU" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(vacationRentalJsonLd) }} />
      
      <div className="section bg-[#FAF8F5] pt-8 pb-16">
        <div className="container">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="eyebrow flex items-center gap-1.5">
                <Building2 size={14} /> Furnished Whole House · Pakenham VIC
              </span>
              <h1 className="page-heading mt-2 text-stone-900">
                {property.name}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-600">
                <MapPin size={16} className="text-[#7A4E2D]" /> {property.location}
              </p>
            </div>
            
            <div className="rounded-none bg-[#FAF5EF] border border-[#EADCCF] px-4 py-2.5 text-xs font-bold text-[#7A4E2D] flex items-center gap-2">
              <Building2 size={16} /> Located beside Serenity 7, 9 & 11 (Adjacent Houses)
            </div>
          </div>

          {/* Only approved uploaded photos are shown publicly. */}
          {visibleImages.length ? (
            <div className="relative mt-6 overflow-hidden rounded-none border border-stone-200 shadow-sm">
              <div className="grid gap-2 md:grid-cols-4 md:grid-rows-2">
                <button
                  className="relative h-80 md:h-[460px] md:col-span-2 md:row-span-2 group overflow-hidden cursor-pointer"
                  onClick={() => setGalleryOpen(true)}
                >
                  <Image
                    src={visibleImages[0].src}
                    alt={visibleImages[0].alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </button>

                {visibleImages.slice(1, 5).map((image, idx) => (
                  <button
                    key={image.src + idx}
                    className="group relative h-40 md:h-[226px] overflow-hidden cursor-pointer"
                    onClick={() => setGalleryOpen(true)}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </button>
                ))}
              </div>

              <button
                className="btn-outline-dark absolute right-4 bottom-4 bg-white/95 backdrop-blur-md text-xs font-bold shadow-lg"
                onClick={() => setGalleryOpen(true)}
              >
                <Images size={16} /> View all photos ({visibleImages.length})
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-none border border-dashed border-stone-300 bg-white px-6 py-12 text-center text-sm text-stone-600">
              Photos for this house will be added soon.
            </div>
          )}

          {/* Content Layout */}
          <div className="mt-10 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7 xl:col-span-8 space-y-10">
              
              {/* Quick specs */}
              <section className="card p-6 bg-white border border-stone-200">
                <h2 className="section-heading text-stone-900">{property.propertyType} in Pakenham</h2>
                <div className="mt-4 flex flex-wrap gap-6 text-sm text-stone-600">
                  <span className="flex items-center gap-2 font-medium">
                    <Users size={18} className="text-[#7A4E2D]" /> Up to {formatAuNumber(property.maxGuests)} guests
                  </span>
                  <span className="flex items-center gap-2 font-medium">
                    <BedDouble size={18} className="text-[#7A4E2D]" /> {formatAuNumber(property.bedrooms)} bedrooms
                  </span>
                  <span className="flex items-center gap-2 font-medium">
                    <BedDouble size={18} className="text-[#7A4E2D]" /> {formatAuNumber(property.beds)} beds
                  </span>
                  <span className="flex items-center gap-2 font-medium">
                    <Bath size={18} className="text-[#7A4E2D]" /> {formatAuNumber(property.bathrooms)} bathrooms
                  </span>
                  <span className="flex items-center gap-2 font-medium">
                    <Dog size={18} className="text-[#7A4E2D]" /> Pet-friendly
                  </span>
                </div>
              </section>

              {/* Highlights */}
              <section className="grid gap-4 sm:grid-cols-3">
                {[
                  [KeyRound, "Keyless Self Check-in", "Keypad access anytime after 3:00 PM"],
                  [Home, "Entire Private House", "Exclusive private home & garden"],
                  [BriefcaseBusiness, "Corporate Suitable", "Teams & contractors welcome"],
                  [CalendarDays, "Long-term Rates", "Weekly & monthly discounts"],
                  [Dog, "Pet-friendly", "Declared pets welcome"],
                  [Building2, "Adjacent Houses", "Next door to Serenity 7 & 9"],
                ].map(([Icon, title, text]) => (
                  <article key={title as string} className="card p-4 bg-white">
                    <Icon className="text-[#7A4E2D]" size={20} />
                    <h3 className="mt-2 text-sm font-bold text-stone-900">{title as string}</h3>
                    <p className="mt-0.5 text-xs text-stone-500">{text as string}</p>
                  </article>
                ))}
              </section>

              {[
                ["Kitchen", property.kitchenFacilities],
                ["Laundry", property.laundryFacilities],
                ["Wi-Fi", property.wifiInformation],
                ["Workspace", property.workspaceInformation],
                ["Heating and cooling", property.heatingCooling],
                ["Self check-in", property.selfCheckInDetails],
                ["Safety", property.safetyInformation],
                ["Cancellation", property.cancellationPolicy],
                ["Corporate stays", property.corporateInformation],
              ].some(([, value]) => Boolean(value)) ? <section className="card grid gap-4 bg-white p-6">
                <div><p className="eyebrow">House details</p><h2 className="section-heading mt-1 text-stone-900">Practical information for your stay</h2></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Kitchen", property.kitchenFacilities],
                    ["Laundry", property.laundryFacilities],
                    ["Wi-Fi", property.wifiInformation],
                    ["Workspace", property.workspaceInformation],
                    ["Heating and cooling", property.heatingCooling],
                    ["Self check-in", property.selfCheckInDetails],
                    ["Safety", property.safetyInformation],
                    ["Cancellation", property.cancellationPolicy],
                    ["Corporate stays", property.corporateInformation],
                  ].filter(([, value]) => Boolean(value)).map(([label, value]) => <div key={label as string} className="rounded-none bg-[#FAF8F5] p-4"><h3 className="text-sm font-bold text-stone-900">{label as string}</h3><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-600">{value as string}</p></div>)}
                </div>
              </section> : null}

              {/* Description */}
              <section className="property-about-section">
                <div className="property-about-heading">
                  <span className="eyebrow">About your stay</span>
                  <h2 className="section-heading mt-2 text-stone-900">About this house</h2>
                </div>

                <div className="property-about-copy">
                  <p>{property.fullDescription}</p>
                </div>

                <div className="property-adjacent-callout">
                  <span className="property-adjacent-icon" aria-hidden="true">
                    <Building2 size={18} />
                  </span>
                  <div>
                    <p className="property-adjacent-title">Three houses beside each other</p>
                    <p className="property-adjacent-text">Serenity 7, Serenity 9, and Serenity 11 are adjacent to one another. Contact us for multi-house bookings if you have larger groups, company project crews, or multi-family holidays.</p>
                  </div>
                </div>
              </section>

              {/* Sleeping arrangements */}
              <section>
                <h2 className="section-heading text-stone-900 mb-4">Sleeping arrangements</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {property.bedArrangements.map((room) => (
                    <article key={room.room} className="card p-5 bg-white">
                      <BedDouble className="text-[#7A4E2D]" size={22} />
                      <h3 className="mt-3 font-bold text-stone-900 text-sm">{room.room}</h3>
                      <p className="mt-1 text-xs text-stone-600">{room.beds}</p>
                    </article>
                  ))}
                </div>
              </section>

              {/* Amenities */}
              <section>
                <h2 className="section-heading text-stone-900 mb-4">Amenities</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {property.amenities.slice(0, 10).map((amenity) => (
                    <div key={amenity} className="flex items-center gap-3 rounded-none border border-stone-200 bg-white p-3.5 text-xs font-semibold text-stone-800">
                      <ShieldCheck className="text-[#7A4E2D]" size={16} /> {amenity}
                    </div>
                  ))}
                </div>
                <button className="btn-outline-dark mt-4 text-xs font-bold" onClick={() => setAmenitiesOpen(true)}>
                  Show all amenities ({property.amenities.length})
                </button>
              </section>

              {/* Availability */}
              <section>
                <h2 className="section-heading text-stone-900 mb-2">Availability Calendar</h2>
                <p className="text-xs text-stone-500 mb-4">Select your stay dates to calculate total AUD rate and check availability.</p>
                <MiniCalendar property={property} today={today} checkIn={booking.checkIn} checkout={booking.checkout} blockedDates={blockedDates} availabilityLoading={availabilityLoading} onCheckInSelect={(checkIn) => setBooking({ propertySlug: property.slug, checkIn, checkout: "" })} onSelect={(checkIn, checkout) => setBooking({ propertySlug: property.slug, checkIn, checkout })} />
                {availabilityError && <p className="mt-2 text-xs font-semibold text-stone-600">{availabilityError}</p>}
                {booking.checkIn && booking.checkout && <p className="mt-2 text-sm font-semibold text-[#8A3325]">{validateDateRange(property, booking.checkIn, booking.checkout, today, blockedDates)}</p>}
              </section>

              {/* House Rules */}
              <section>
                <h2 className="section-heading text-stone-900 mb-4">House Rules & Policies</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {property.houseRules.map((rule) => (
                    <div key={rule} className="rounded-none border border-stone-200 bg-white p-3.5 text-xs text-stone-700">
                      • {rule}
                    </div>
                  ))}
                </div>
              </section>

              {/* Location Map */}
              <section>
                <h2 className="section-heading text-stone-900 mb-4">Approximate Location</h2>
                <ApproximateMap compact title="Pakenham Victoria Accommodation Area" />
                <p className="mt-3 text-xs text-stone-500">
                  Exact property address and key safe details are sent automatically upon booking confirmation.
                </p>
              </section>

              {/* Related Houses */}
              <section className="pt-4 border-t border-stone-200">
                <h2 className="section-heading text-stone-900 mb-6">Other Serenity Houses Beside This Property</h2>
                <RelatedHouses currentSlug={property.slug} properties={relatedProperties} />
              </section>
            </div>

            {/* Desktop Sticky Booking Widget */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
              <div className="sticky top-28">
                <BookingCard property={property} today={today} blockedDates={blockedDates} availabilityLoading={availabilityLoading} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Reserve Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-300 bg-white p-4 shadow-2xl lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-stone-900">{formatAud(mobileDisplayPrice)}</p>
            <p className="text-xs text-stone-500">{price.nights ? `${price.nights} night${price.nights > 1 ? "s" : ""} stay` : "Select dates"}</p>
          </div>
          <button className="btn-primary text-sm px-6" onClick={() => setDrawerOpen(true)}>
            Reserve
          </button>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <BookingCard property={property} today={today} blockedDates={blockedDates} availabilityLoading={availabilityLoading} />
      </Drawer>

      <PhotoTour property={{ ...property, images: visibleImages }} open={galleryOpen} onClose={() => setGalleryOpen(false)} />

      <Modal title="All House Amenities" open={amenitiesOpen} onClose={() => setAmenitiesOpen(false)}>
        <div className="grid gap-3 sm:grid-cols-2">
          {property.amenities.map((amenity) => (
            <div key={amenity} className="rounded-none border border-stone-200 p-3.5 text-xs font-semibold text-stone-800">
              ✓ {amenity}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
