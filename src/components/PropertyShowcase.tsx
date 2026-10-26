import { AmenityIcon } from "@/src/components/AmenityIcon";
import type { Property, PropertyImage } from "@/src/data/properties";
import { normalizeAmenities } from "@/src/lib/amenities";
import { corporateBookingWording } from "@/src/lib/publicPageCopy";
import { ArrowLeft, Bath, BedDouble, CalendarDays, Camera, Car, Check, ChevronRight, ClipboardList, CookingPot, DoorOpen, KeyRound, Map, MapPin, Shield, Snowflake, Users, WashingMachine, Wifi } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const imageUnoptimized = (src: string) => src.includes("a0.muscache.com");

function Photo({ image, alt, sizes, priority = false }: { image: PropertyImage; alt: string; sizes: string; priority?: boolean }) {
  return <Image src={image.src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={imageUnoptimized(image.src)} referrerPolicy={imageUnoptimized(image.src) ? "no-referrer" : undefined} />;
}

export function PropertyShowcase({ property, images, onOpenPhotos, onOpenAmenities }: { property: Property; images: PropertyImage[]; onOpenPhotos: () => void; onOpenAmenities: () => void }) {
  const name = property.listingTitle?.trim() || property.name.replace(/\s+-\s+Whole$/i, "");
  const extra = property.listingDetails && typeof property.listingDetails === "object" ? property.listingDetails : {};
  const locality = property.location.split(",")[0]?.trim() || "Pakenham";
  const tagline = typeof extra.showcase_tagline === "string" && extra.showcase_tagline.trim() ? extra.showcase_tagline.trim() : `A comfortable, furnished home in ${locality}`;
  const hostBio = typeof extra.showcase_host_bio === "string" ? extra.showcase_host_bio.trim() : "";
  const amenities = normalizeAmenities(property.amenities, property.amenityDetails);
  const hasAmenity = (pattern: RegExp) => amenities.some((amenity) => pattern.test(amenity.label));
  const safetyAmenities = amenities.filter((amenity) => /smoke alarm|carbon monoxide|fire extinguisher|first.aid|security camera|deadbolt/i.test(amenity.label));
  const selfCheckIn = Boolean(property.selfCheckInDetails || hasAmenity(/self check.?in|key safe|lockbox/i));
  const photoPriority = (image: PropertyImage) => /living|lounge|family/i.test(`${image.category || ""} ${image.categoryLabel || ""}`) ? 0 : /kitchen|dining/i.test(`${image.category || ""} ${image.categoryLabel || ""}`) ? 1 : /bedroom/i.test(`${image.category || ""} ${image.categoryLabel || ""}`) ? 2 : /outdoor|patio|garden/i.test(`${image.category || ""} ${image.categoryLabel || ""}`) ? 3 : 4;
  const previewImages = images.slice(1).map((image, index) => ({ image, index })).sort((a, b) => photoPriority(a.image) - photoPriority(b.image) || a.index - b.index).slice(0, 4).map(({ image }) => image);
  const nav = [
    { id: "house-overview", label: "Overview", Icon: DoorOpen },
    ...(amenities.length ? [{ id: "house-amenities", label: "Amenities", Icon: Wifi }] : []),
    ...(property.floorPlan ? [{ id: "floor-plan", label: "Floor plan", Icon: Map }] : []),
    { id: "location", label: "Location", Icon: MapPin },
    ...(property.houseRules.length ? [{ id: "house-rules", label: "House rules", Icon: ClipboardList }] : []),
    ...(property.safetyInformation || safetyAmenities.length ? [{ id: "house-safety", label: "Guest safety", Icon: Shield }] : []),
    { id: "house-booking", label: "Booking", Icon: CalendarDays },
    { id: "house-checkin", label: "Check-in", Icon: KeyRound },
    { id: "house-host", label: "Your host", Icon: Users },
  ];

  return <div className="property-showcase">
    <section className="property-showcase-hero" aria-labelledby="property-showcase-title">
      {images[0] && <div className="property-showcase-hero-media"><Photo image={images[0]} alt={images[0].alt || name} sizes="(max-width: 768px) 100vw, 1240px" priority /></div>}
      <div className="property-showcase-hero-content">
        <Link href="/homes" className="property-showcase-back"><ArrowLeft size={17} aria-hidden="true" />All Serenity homes</Link>
        <p className="property-showcase-eyebrow">Furnished private home · {locality}</p>
        <h1 id="property-showcase-title">{name}</h1>
        <p className="property-showcase-tagline">{tagline}</p>
        <p className="property-showcase-location"><MapPin size={17} aria-hidden="true" />{property.location}</p>
        <div className="property-showcase-hero-facts">
          <span><Users size={18} aria-hidden="true" />Up to {property.maxGuests} guests</span>
          <span><BedDouble size={18} aria-hidden="true" />{property.bedrooms} bedrooms · {property.beds} beds</span>
          <span><Bath size={18} aria-hidden="true" />{property.bathrooms} bathrooms</span>
        </div>
        <div className="property-showcase-hero-actions">
          <a href="#availability" className="property-showcase-button is-gold"><CalendarDays size={18} aria-hidden="true" />Check availability <ChevronRight size={16} aria-hidden="true" /></a>
          {property.corporateBookingAllowed && <Link href="/corporate-stays#corporate-booking" className="property-showcase-button is-outline"><DoorOpen size={18} aria-hidden="true" />Partner booking <ChevronRight size={16} aria-hidden="true" /></Link>}
        </div>
      </div>
    </section>
    <nav className="property-showcase-nav" aria-label="House information">
      {nav.map(({ id, label, Icon }) => <a key={id} href={`#${id}`}><Icon size={22} strokeWidth={1.75} aria-hidden="true" /><span>{label}</span></a>)}
    </nav>

    <section className="property-showcase-overview" id="house-overview">
      <div className="property-showcase-overview-copy">
        <p className="property-showcase-kicker">Discover the home</p>
        <h2>About {name}</h2>
        <p>{property.fullDescription || property.shortDescription}</p>
        {images.length > 0 && <button type="button" className="property-showcase-button is-gold" onClick={onOpenPhotos}><Camera size={18} aria-hidden="true" />View all {images.length} photos <ChevronRight size={16} aria-hidden="true" /></button>}
      </div>
      {previewImages.length > 0 && <div className="property-showcase-mosaic" aria-label={`${name} photo preview`}>
        {previewImages.map((image, index) => <button type="button" key={`${image.src}-${index}`} onClick={onOpenPhotos} aria-label={`View photo: ${image.alt || `${name} photo ${index + 2}`}`}><Photo image={image} alt={image.alt || `${name} photo ${index + 2}`} sizes="(max-width: 760px) 50vw, 25vw" /></button>)}
      </div>}
    </section>

    <div className="property-showcase-card-band">
    <section className="property-showcase-features" aria-labelledby="property-showcase-features-title">
      <h2 id="property-showcase-features-title">Key features</h2>
      <div className="property-showcase-feature-list">
        <span><Users size={25} aria-hidden="true" />Up to {property.maxGuests} guests</span>
        <span><BedDouble size={25} aria-hidden="true" />{property.bedrooms} bedrooms</span>
        <span><Bath size={25} aria-hidden="true" />{property.bathrooms} bathrooms</span>
        <span><DoorOpen size={25} aria-hidden="true" />Private home</span>
        {(property.wifiInformation || hasAmenity(/wi.?fi|internet/i)) && <span><Wifi size={25} aria-hidden="true" />Wi-Fi</span>}
        {(property.kitchenFacilities || hasAmenity(/kitchen/i)) && <span><CookingPot size={25} aria-hidden="true" />Kitchen</span>}
        {(property.laundryFacilities || hasAmenity(/laundry|washing machine/i)) && <span><WashingMachine size={25} aria-hidden="true" />Laundry</span>}
        {(property.heatingCooling || hasAmenity(/air.?condition|heating/i)) && <span><Snowflake size={25} aria-hidden="true" />Heating & cooling</span>}
        {property.parkingType && <span><Car size={25} aria-hidden="true" />{property.parkingType}</span>}
      </div>
    </section>

    <div className="property-showcase-info-grid">
      {amenities.length > 0 && <section className="property-showcase-panel property-showcase-amenities" id="house-amenities">
        <h2>Amenities</h2>
        <div className="property-showcase-amenity-list">{amenities.slice(0, 8).map((amenity) => <span key={`${amenity.id}-${amenity.label}`}><AmenityIcon icon={amenity.icon} />{corporateBookingWording(amenity.label)}</span>)}</div>
        {amenities.length > 8 && <button type="button" className="property-showcase-text-action" onClick={onOpenAmenities}>View all {amenities.length} amenities <ChevronRight size={16} aria-hidden="true" /></button>}
      </section>}
      <section className="property-showcase-panel" id="house-checkin">
        <h2><KeyRound size={24} aria-hidden="true" />{selfCheckIn ? "Self check-in" : "Check-in details"}</h2>
        <p>{property.selfCheckInDetails || (selfCheckIn ? "Self check-in is available. Arrival instructions and access information are shared with confirmed guests." : "Check-in arrangements and arrival details are shared with confirmed guests before their stay.")}</p>
        {property.checkIn && <p className="property-showcase-panel-note">Check-in: {property.checkIn}</p>}
        {property.checkout && <p className="property-showcase-panel-note">Checkout: {property.checkout}</p>}
      </section>
      {property.corporateBookingAllowed && <section className="property-showcase-panel">
        <h2><DoorOpen size={24} aria-hidden="true" />Corporate bookings</h2>
        <p>{corporateBookingWording(property.corporateInformation || property.corporateInstructions || "Corporate bookings are available for approved partners.")}</p>
        <ul>
          <li>Partner ID required for online corporate booking</li>
          {property.longTermStaysAllowed && <li>Longer stays available</li>}
        </ul>
      </section>}
    </div>

    <div className="property-showcase-details-grid">
      {property.houseRules.length > 0 && <section className="property-showcase-panel" id="house-rules"><h2><ClipboardList size={23} aria-hidden="true" />House rules</h2><ul className="property-showcase-check-list">{property.houseRules.map((rule) => <li key={rule}><Check size={16} aria-hidden="true" />{rule}</li>)}</ul>{property.petPolicy && <p className="property-showcase-panel-note">{property.petPolicy}</p>}</section>}
      {(property.safetyInformation || safetyAmenities.length > 0) && <section className="property-showcase-panel" id="house-safety"><h2><Shield size={23} aria-hidden="true" />Guest safety</h2>{property.safetyInformation && <p>{property.safetyInformation}</p>}{safetyAmenities.length > 0 && <ul className="property-showcase-check-list">{safetyAmenities.map((amenity) => <li key={amenity.id}><Check size={16} aria-hidden="true" />{amenity.label}</li>)}</ul>}</section>}
      <section className="property-showcase-panel" id="house-booking"><h2><CalendarDays size={23} aria-hidden="true" />Booking & cancellation</h2><ul><li>Minimum stay: {property.minimumStay} nights</li><li>Free cancellation until 11:59 pm Melbourne time, {property.freeCancellationDays} day{property.freeCancellationDays === 1 ? "" : "s"} before check-in</li><li>Direct booking subject to availability</li>{property.longTermStaysAllowed && <li>Longer stays available</li>}</ul><p className="property-showcase-panel-note">Contact Serenity to cancel. The deadline for your dates is shown before payment.</p><a className="property-showcase-text-action" href="#availability">View dates and pricing <ChevronRight size={16} aria-hidden="true" /></a></section>
      <section className="property-showcase-panel" id="house-host"><h2><Users size={23} aria-hidden="true" />About your host</h2><p>{hostBio || "The Serenity team can help with questions about the house and your stay."}</p><Link className="property-showcase-text-action" href="/contact">Contact Serenity <ChevronRight size={16} aria-hidden="true" /></Link></section>
    </div>
    </div>

    {property.corporateBookingAllowed && <aside className="property-showcase-partner"><div><p>Regular corporate client?</p><h2>Book using your Partner ID</h2><span>Access your organisation’s booking arrangement for this home.</span></div><Link href="/corporate-stays#corporate-booking" className="property-showcase-button is-gold">Go to partner booking <ChevronRight size={16} aria-hidden="true" /></Link></aside>}
  </div>;
}
