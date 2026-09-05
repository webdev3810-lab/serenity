"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AirVent, BedDouble, BriefcaseBusiness, CalendarDays, Car, Check, ChefHat, ChevronLeft, ChevronRight, Dog, DoorOpen, Images, KeyRound, Sparkles, Star, Tv, Utensils, WashingMachine, Wifi, X } from "lucide-react";
import { SerenityLocationMap } from "@/src/components/SerenityLocationMap";
import type { Property, PropertyImage } from "@/src/data/properties";
import { BookingCard, MiniCalendar, RelatedHouses } from "@/src/components/BookingWidgets";
import { Drawer, Modal } from "@/src/components/UI";
import ScrollWipeText from "@/src/components/homepage/ScrollWipeText";
import HomepageReviewsCarousel from "@/src/components/homepage/HomepageReviewsCarousel";
import { calculatePrice, defaultGuests, formatAud, validateDateRange } from "@/src/lib/booking";
import { formatAuNumber } from "@/src/lib/localization";
import { useBooking } from "@/src/context/BookingContext";

const isRemotePreviewImage = (src: string) => src.includes("a0.muscache.com");

function amenityIcon(amenity: string): LucideIcon {
  const label = amenity.toLowerCase();

  if (label.includes("check-in") || label.includes("key safe")) return KeyRound;
  if (label.includes("wi-fi") || label.includes("wifi")) return Wifi;
  if (label.includes("kitchen")) return ChefHat;
  if (label.includes("laundry") || label.includes("washing")) return WashingMachine;
  if (label.includes("parking")) return Car;
  if (label.includes("tv") || label.includes("television") || label.includes("netflix")) return Tv;
  if (label.includes("heating")) return Sparkles;
  if (label.includes("air conditioning")) return AirVent;
  if (label.includes("dining")) return Utensils;
  if (label.includes("entrance")) return DoorOpen;
  if (label.includes("long-term")) return CalendarDays;
  if (label.includes("pet")) return Dog;
  if (label.includes("corporate")) return BriefcaseBusiness;
  if (label.includes("family")) return BedDouble;

  return Check;
}

type PhotoTourPhoto = PropertyImage & {
  categoryLabel: string;
  categorySlug: string;
  categoryOrder: number;
  photoOrder: number;
  photoIndex: number;
};

type PhotoTourCategory = {
  slug: string;
  label: string;
  description: string;
  order: number;
  images: PhotoTourPhoto[];
};

const photoTourCategorySlug = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "other";

function groupPhotoTourImages(images: PropertyImage[]) {
  const categories = new Map<string, PhotoTourCategory>();

  images.forEach((image, index) => {
    const label = image.categoryLabel?.trim() || image.category?.trim() || "Other";
    const slug = photoTourCategorySlug(image.category?.trim() || label);
    const photo: PhotoTourPhoto = {
      ...image,
      categoryLabel: label,
      categorySlug: slug,
      categoryOrder: Number(image.categoryOrder ?? index),
      photoOrder: index,
      photoIndex: 0,
    };
    const existing = categories.get(slug);

    if (existing) {
      existing.images.push(photo);
      existing.order = Math.min(existing.order, photo.categoryOrder);
      return;
    }

    categories.set(slug, {
      slug,
      label,
      description: image.categoryDescription?.trim() || "",
      order: photo.categoryOrder,
      images: [photo],
    });
  });

  const sortedCategories = [...categories.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((category) => ({
      ...category,
      images: [...category.images].sort((a, b) => a.photoOrder - b.photoOrder),
    }));
  let photoIndex = 0;
  sortedCategories.forEach((category) => {
    category.images.forEach((photo) => {
      photo.photoIndex = photoIndex;
      photoIndex += 1;
    });
  });

  return { categories: sortedCategories, photos: sortedCategories.flatMap((category) => category.images) };
}

function PhotoTour({ property, open, onClose }: { property: Property; open: boolean; onClose: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const images = property.images.filter((image) => image.src && image.isVisible !== false);
  const { categories: photoCategories, photos } = groupPhotoTourImages(images);
  const displayName = property.listingTitle?.trim() || property.name.replace(/\s+-\s+Whole$/i, "");

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

  const activeImage = photos[activeIndex % photos.length];
  const showPrevious = () => setActiveIndex((current) => (current - 1 + photos.length) % photos.length);
  const showNext = () => setActiveIndex((current) => (current + 1) % photos.length);

  return (
    <div className="property-photo-tour" role="dialog" aria-modal="true" aria-labelledby="photo-tour-title">
      <header className="property-photo-tour-header">
        <div className="property-photo-tour-header-inner">
          <button type="button" onClick={onClose} className="property-photo-tour-close" aria-label="Close photo tour">
            <X size={17} aria-hidden="true" />
            <span>Close</span>
          </button>
          <div className="property-photo-tour-identity">
            <p>Photo tour</p>
            <h2 id="photo-tour-title">{displayName}</h2>
          </div>
          <p className="property-photo-tour-count"><strong>{images.length}</strong> photographs</p>
        </div>
      </header>

      <main className="property-photo-tour-main">
        <section className="property-photo-tour-browser" aria-labelledby="property-photo-tour-heading">
          <div className="property-photo-tour-browser-heading">
            <h3 id="property-photo-tour-heading">Photo tour</h3>
          </div>
          <nav className="property-photo-tour-category-nav" aria-label="Browse rooms and areas">
            {photoCategories.map((category) => (
              <button
                key={category.slug}
                type="button"
                aria-label={`Scroll to ${category.label}`}
                onClick={() => document.getElementById(`photo-tour-category-${category.slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                <span className="property-photo-tour-category-nav-thumb" aria-hidden="true">
                  <Image src={category.images[0].src} alt="" fill sizes="(max-width: 640px) 94px, 124px" />
                </span>
                <span className="property-photo-tour-category-nav-label">{category.label}</span>
              </button>
            ))}
          </nav>
        </section>

        {photoCategories.map((category) => (
          <section key={category.slug} id={`photo-tour-category-${category.slug}`} className="property-photo-tour-category property-photo-tour-room-section" aria-labelledby={`photo-tour-category-title-${category.slug}`}>
            <header className="property-photo-tour-category-heading">
              <div className="property-photo-tour-category-name">
                <h4 id={`photo-tour-category-title-${category.slug}`}>{category.label}</h4>
                <span>{category.images.length} {category.images.length === 1 ? "photo" : "photos"}</span>
              </div>
              {category.description ? <p>{category.description}</p> : null}
            </header>
            <div className="property-photo-tour-grid">
              {category.images.map((image) => (
                <button
                  key={image.src + image.photoIndex}
                  type="button"
                  onClick={() => { setActiveIndex(image.photoIndex); setLightboxOpen(true); }}
                  className="property-photo-tour-item"
                  aria-label={`View photo ${image.photoIndex + 1} of ${photos.length}: ${image.alt}`}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    unoptimized={isRemotePreviewImage(image.src)}
                    referrerPolicy={isRemotePreviewImage(image.src) ? "no-referrer" : undefined}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 720px"
                  />
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>

      {lightboxOpen && (
        <div className="property-photo-lightbox" role="dialog" aria-modal="true" aria-label={`Photo ${activeIndex + 1} of ${photos.length}`} onClick={() => setLightboxOpen(false)}>
          <div className="property-photo-lightbox-shell" onClick={(event) => event.stopPropagation()}>
            <div className="property-photo-lightbox-header">
              <div>
                <p>{displayName}</p>
                <span>{activeImage.categoryLabel}</span>
              </div>
              <button type="button" onClick={() => setLightboxOpen(false)} className="property-photo-lightbox-close" aria-label="Close enlarged photo">
                Close <X size={17} aria-hidden="true" />
              </button>
            </div>
            <div className="property-photo-lightbox-stage">
              <button type="button" onClick={showPrevious} className="property-photo-lightbox-arrow is-previous" aria-label="Previous photo">
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
              <div className="property-photo-lightbox-image">
                <Image
                  src={activeImage.src}
                  alt={activeImage.alt}
                  width={1600}
                  height={1200}
                  unoptimized={isRemotePreviewImage(activeImage.src)}
                  referrerPolicy={isRemotePreviewImage(activeImage.src) ? "no-referrer" : undefined}
                  sizes="(max-width: 768px) 96vw, 82vw"
                />
              </div>
              <button type="button" onClick={showNext} className="property-photo-lightbox-arrow is-next" aria-label="Next photo">
                <ChevronRight size={22} aria-hidden="true" />
              </button>
            </div>
            <div className="property-photo-lightbox-caption">
              <p>{activeImage.alt}</p>
              <span>Use arrow keys or controls to browse</span>
            </div>
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
  const visibleImages = property.images.filter((image) => image.src && image.isVisible !== false);
  const price = calculatePrice(property, booking.checkIn, booking.checkout, booking.guests ?? defaultGuests);
  const mobileDisplayPrice = price.nights > 0 ? price.total : property.nightlyPrice;
  const displayName = property.listingTitle?.trim() || property.name.replace(/\s+-\s+Whole$/i, "");
  const longerStaySummary = [
    property.weeklyDiscount > 0 ? `${property.weeklyDiscount}% weekly discount` : "",
    property.monthlyDiscount > 0 ? `${property.monthlyDiscount}% monthly discount` : "",
  ].filter(Boolean).join(" · ") || (property.longTermStaysAllowed ? "Long-term stays are available." : "");
  const practicalDetails = [
    ["Kitchen", property.kitchenFacilities],
    ["Laundry", property.laundryFacilities],
    ["Wi-Fi", property.wifiInformation],
    ["Workspace", property.workspaceInformation],
    ["Heating and cooling", property.heatingCooling],
    ["Safety", property.safetyInformation],
    ["Cancellation", property.cancellationPolicy],
  ].filter(([, value]) => Boolean(value));
  const stayHighlights = [
    { Icon: KeyRound, title: "Arrival and departure", text: [property.checkIn, property.checkout, property.selfCheckInDetails].filter(Boolean).join(" · "), show: true },
    { Icon: Car, title: "Parking", text: property.parkingType, show: Boolean(property.parkingType) },
    { Icon: Dog, title: property.petsAllowed ? "Pets welcome" : "Pet policy", text: property.petPolicy, show: Boolean(property.petPolicy) },
    { Icon: BriefcaseBusiness, title: "Corporate stays", text: property.corporateInformation || property.corporateInstructions, show: property.corporateBookingAllowed },
    { Icon: CalendarDays, title: "Longer stays", text: longerStaySummary, show: property.longTermStaysAllowed && Boolean(longerStaySummary) },
  ].filter((item) => item.show && item.text);
  const publishedReviews = (property.reviews ?? [])
    .filter((review) => review.published)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const propertyReviewCards = publishedReviews.slice(0, 6).map((review) => ({
    id: review.id,
    reviewerName: review.reviewerName,
    reviewText: review.reviewText,
    propertyName: displayName,
    propertySlug: property.slug,
    reviewDate: review.reviewDate,
    reviewDateLabel: review.reviewDateLabel,
  }));

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
    name: displayName,
    description: property.fullDescription,
    containsPlace: { "@type": "Accommodation", occupancy: { "@type": "QuantitativeValue", value: property.maxGuests } },
    address: { "@type": "PostalAddress", addressLocality: property.location, addressCountry: "AU" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(vacationRentalJsonLd) }} />
      
      <div className="property-editorial-page">
        <div className="property-editorial-shell">
          <Link href="/houses" className="property-editorial-back-link">
            <ChevronLeft size={15} aria-hidden="true" />
            <span>Back to houses</span>
          </Link>

          <header className="property-editorial-heading">
            <div>
              <p className="property-editorial-kicker">{property.propertyType} · {property.location}</p>
              <ScrollWipeText as="h1">{displayName}</ScrollWipeText>
            </div>
            <div className="property-editorial-heading-copy">
              <p>{property.shortDescription}</p>
              <a href="#availability">Check availability <span aria-hidden="true">↗</span></a>
            </div>
          </header>

          <div className="property-editorial-facts" aria-label={`${displayName} key facts`}>
            <span><b>{formatAuNumber(property.maxGuests)}</b> guests</span>
            <span><b>{formatAuNumber(property.bedrooms)}</b> bedrooms</span>
            <span><b>{formatAuNumber(property.beds)}</b> beds</span>
            <span><b>{formatAuNumber(property.bathrooms)}</b> bathrooms</span>
            <span><b>{formatAud(property.nightlyPrice)}</b> AUD / night</span>
          </div>

          {/* Only approved uploaded photos are shown publicly. */}
          {visibleImages.length ? (
            <div className="property-editorial-gallery">
              <div className="property-editorial-gallery-grid">
                <button
                  className="property-editorial-gallery-main group"
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
                    className="property-editorial-gallery-tile group"
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
                className="property-editorial-gallery-action"
                onClick={() => setGalleryOpen(true)}
              >
                <Images size={16} /> View all photos ({visibleImages.length})
              </button>
            </div>
          ) : (
            <div className="property-editorial-gallery-empty">
              Photos for this home will be added soon.
            </div>
          )}

          {/* Content Layout */}
          <div className="property-editorial-body">
            <div className="property-editorial-content">
              <section className="property-editorial-section property-editorial-highlights" aria-labelledby="stay-details-title">
                <div className="property-editorial-section-heading">
                  <p>Stay details</p>
                  <ScrollWipeText as="h2" id="stay-details-title">What this home includes.</ScrollWipeText>
                </div>
                <div className="property-editorial-highlight-grid">
                  {stayHighlights.map(({ Icon, title, text }) => (
                    <article key={title}>
                      <Icon size={19} aria-hidden="true" />
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </article>
                  ))}
                </div>
              </section>

              {practicalDetails.length ? <section className="property-editorial-section" aria-labelledby="practical-details-title">
                <div className="property-editorial-section-heading"><p>From your host</p><ScrollWipeText as="h2" id="practical-details-title">Practical information.</ScrollWipeText></div>
                <div className="property-editorial-practical-grid">
                  {practicalDetails.map(([label, value]) => <div key={label as string}><h3>{label as string}</h3><p>{value as string}</p></div>)}
                </div>
              </section> : null}

              {/* Description */}
              <section className="property-editorial-section property-about-section" aria-labelledby="about-house-title">
                <div className="property-editorial-section-heading property-about-heading">
                  <p>About your stay</p>
                  <ScrollWipeText as="h2" id="about-house-title">About this home.</ScrollWipeText>
                </div>

                <div className="property-about-copy">
                  <p>{property.fullDescription}</p>
                </div>

              </section>

              {publishedReviews.length ? (
                <section className="property-editorial-section property-editorial-reviews" aria-labelledby="reviews-title">
                  <div className="property-editorial-section-heading">
                    <p>Guest reviews</p>
                    <ScrollWipeText as="h2" id="reviews-title">What guests say.</ScrollWipeText>
                  </div>
                  <div className="property-editorial-review-summary">
                    <span>5.0</span>
                    <div aria-label="Five-star guest rating" className="property-editorial-review-stars">
                      {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill="currentColor" strokeWidth={0} aria-hidden="true" />)}
                    </div>
                    <p>Verified notes from guests who stayed at {displayName}.</p>
                  </div>
                  <HomepageReviewsCarousel reviews={propertyReviewCards} />
                </section>
              ) : null}

              {/* Sleeping arrangements */}
              {property.bedArrangements.length ? (
                <section className="property-editorial-section" aria-labelledby="sleeping-title">
                  <div className="property-editorial-section-heading">
                    <p>Room by room</p>
                    <ScrollWipeText as="h2" id="sleeping-title">Sleeping arrangements.</ScrollWipeText>
                  </div>
                  <div className="property-editorial-sleep-grid">
                    {property.bedArrangements.map((room, index) => (
                      <article key={`${room.room}-${index}`}>
                        <BedDouble size={21} aria-hidden="true" />
                        <h3>{room.room}</h3>
                        <p>{room.beds}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Amenities */}
              {property.amenities.length ? (
                <section className="property-editorial-section" aria-labelledby="amenities-title">
                  <div className="property-editorial-section-heading">
                    <p>Included</p>
                    <ScrollWipeText as="h2" id="amenities-title">Amenities.</ScrollWipeText>
                  </div>
                  <div className="property-editorial-amenities-grid">
                    {property.amenities.slice(0, 10).map((amenity) => {
                      const AmenityIcon = amenityIcon(amenity);
                      return (
                        <div key={amenity}>
                          <AmenityIcon size={16} strokeWidth={1.6} aria-hidden="true" />
                          <span>{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                  {property.amenities.length > 10 ? (
                    <button className="property-editorial-button" onClick={() => setAmenitiesOpen(true)}>
                      Show all amenities ({property.amenities.length})
                    </button>
                  ) : null}
                </section>
              ) : null}

              {/* Availability */}
              <section id="availability" className="property-editorial-section property-editorial-availability" aria-labelledby="availability-title">
                <div className="property-editorial-section-heading">
                  <p>Plan your stay</p>
                  <ScrollWipeText as="h2" id="availability-title">Availability.</ScrollWipeText>
                </div>
                <p className="property-editorial-intro">Choose your dates to check current availability and calculate the total in Australian dollars.</p>
                <MiniCalendar property={property} today={today} checkIn={booking.checkIn} checkout={booking.checkout} blockedDates={blockedDates} availabilityLoading={availabilityLoading} onCheckInSelect={(checkIn) => setBooking({ propertySlug: property.slug, checkIn, checkout: "" })} onSelect={(checkIn, checkout) => setBooking({ propertySlug: property.slug, checkIn, checkout })} />
                {availabilityError && <p className="property-editorial-notice">{availabilityError}</p>}
                {booking.checkIn && booking.checkout && <p className="property-editorial-error">{validateDateRange(property, booking.checkIn, booking.checkout, today, blockedDates)}</p>}
              </section>

              {/* House Rules */}
              {property.houseRules.length ? (
                <section className="property-editorial-section" aria-labelledby="rules-title">
                  <div className="property-editorial-section-heading">
                    <p>Before booking</p>
                    <ScrollWipeText as="h2" id="rules-title">House rules.</ScrollWipeText>
                  </div>
                  <div className="property-editorial-rule-grid">
                    {property.houseRules.map((rule) => <div key={rule}>{rule}</div>)}
                  </div>
                </section>
              ) : null}

              {/* Location Map */}
              <section className="property-editorial-section" aria-labelledby="location-title">
                <div className="property-editorial-section-heading">
                  <p>{property.location}</p>
                  <ScrollWipeText as="h2" id="location-title">Where you&apos;ll be.</ScrollWipeText>
                </div>
                {property.nearbyLocations.length ? (
                  <div className="property-editorial-nearby-grid">
                    {property.nearbyLocations.map((location) => <p key={location}>{location}</p>)}
                  </div>
                ) : null}
                <div className="property-editorial-location-map">
                  <SerenityLocationMap />
                </div>
                <p className="property-editorial-caption">Exact address and access instructions are sent after a confirmed booking.</p>
              </section>

              {/* Related Houses */}
              <section className="property-editorial-section" aria-labelledby="related-title">
                <div className="property-editorial-section-heading">
                  <p>Continue browsing</p>
                  <ScrollWipeText as="h2" id="related-title">Other Serenity homes.</ScrollWipeText>
                </div>
                <RelatedHouses currentSlug={property.slug} properties={relatedProperties} />
              </section>
            </div>

            {/* Desktop Sticky Booking Widget */}
            <aside className="property-editorial-booking hidden lg:block">
              <div className="sticky top-28">
                <BookingCard property={property} today={today} blockedDates={blockedDates} availabilityLoading={availabilityLoading} />
              </div>
            </aside>
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
          <button className="property-mobile-book-button btn-primary text-sm px-6" onClick={() => setDrawerOpen(true)}>
            Book
          </button>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <BookingCard property={property} today={today} blockedDates={blockedDates} availabilityLoading={availabilityLoading} />
      </Drawer>

      <PhotoTour property={{ ...property, images: visibleImages }} open={galleryOpen} onClose={() => setGalleryOpen(false)} />

      <Modal title="All House Amenities" open={amenitiesOpen} onClose={() => setAmenitiesOpen(false)}>
        <div className="grid gap-3 sm:grid-cols-2">
          {property.amenities.map((amenity) => {
            const AmenityIcon = amenityIcon(amenity);
            return (
              <div key={amenity} className="flex items-center gap-2.5 rounded-none border border-stone-200 p-3.5 text-xs font-semibold text-stone-800">
                <AmenityIcon size={16} strokeWidth={1.6} aria-hidden="true" />
                <span>{amenity}</span>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
