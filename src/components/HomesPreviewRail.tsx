import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bath, BedDouble, CalendarDays, Car, ChevronRight, ClipboardList, CookingPot, DoorOpen, KeyRound, MapPin, Shield, Snowflake, Users, WashingMachine, Wifi } from "lucide-react";
import type { Property } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import { normalizeAmenities } from "@/src/lib/amenities";
import { corporateBookingWording } from "@/src/lib/publicPageCopy";
import styles from "./HomesPreviewRail.module.css";

function displayName(property: Property) {
  return property.name.replace(/\s+-\s+Whole$/i, "");
}

function HomePreview({ property }: { property: Property }) {
  const name = displayName(property);
  const href = `/properties/${property.slug}`;
  const images = property.images.filter((image) => isApprovedHomepageMediaSource(image.src));
  const cover = isApprovedHomepageMediaSource(property.featuredImage)
    ? { src: property.featuredImage, alt: `${name} exterior` }
    : images[0];
  const photoPriority = (image: Property["images"][number]) => {
    const category = `${image.category || ""} ${image.categoryLabel || ""}`;
    if (/living|lounge|family/i.test(category)) return 0;
    if (/kitchen|dining/i.test(category)) return 1;
    if (/bedroom/i.test(category)) return 2;
    return 3;
  };
  const previewImages = images.filter((image) => image.src !== cover?.src).sort((a, b) => photoPriority(a) - photoPriority(b)).slice(0, 4);
  const amenities = normalizeAmenities(property.amenities, property.amenityDetails);
  const safety = amenities.filter((amenity) => /smoke alarm|carbon monoxide|fire extinguisher|first.aid|security camera|deadbolt/i.test(amenity.label));
  const hasWifi = Boolean(property.wifiInformation || amenities.some((amenity) => /wi.?fi|internet/i.test(amenity.label)));
  const hasKitchen = Boolean(property.kitchenFacilities || amenities.some((amenity) => /kitchen/i.test(amenity.label)));
  const hasLaundry = Boolean(property.laundryFacilities || amenities.some((amenity) => /laundry|washing machine/i.test(amenity.label)));
  const hasHeatingCooling = Boolean(property.heatingCooling || amenities.some((amenity) => /air.?condition|heating/i.test(amenity.label)));
  const hostBio = typeof property.listingDetails?.showcase_host_bio === "string"
    ? property.listingDetails.showcase_host_bio.trim()
    : "";

  return (
    <article id={`home-preview-${property.slug}`} data-property-id={property.id} className={styles.home} aria-label={`${name} preview`}>
      <div className={styles.top}>
        <div className={styles.hero}>
          {cover && <Image src={cover.src} alt={cover.alt || `${name} furnished home`} fill sizes="(max-width: 760px) 90vw, (max-width: 900px) 100vw, 45vw" unoptimized={cover.src.includes(".supabase.co/")} />}
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>Furnished private home · Pakenham</span>
            <h3>{name}</h3>
            <span className={styles.location}><MapPin size={15} aria-hidden="true" />{property.location}</span>
            <Link className={styles.heroLink} href={href}>Explore this home <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className={styles.overview}>
          <div className={styles.overviewCopy}>
            <span className={styles.kicker}>Discover the home</span>
            <h4>About {name}</h4>
            <p className={styles.description}>{property.fullDescription || property.shortDescription}</p>
            <Link className={styles.textLink} href={`${href}#house-overview`}>Read full description <ChevronRight size={15} aria-hidden="true" /></Link>
          </div>
          {previewImages.length > 0 && <div className={styles.photos} aria-label={`${name} photos`}>
            {previewImages.map((image, index) => <div className={styles.photo} key={`${image.src}-${index}`}>
              <Image src={image.src} alt={image.alt || `${name} interior photo ${index + 1}`} fill sizes={index === 0 ? "(max-width: 760px) 90vw, (max-width: 900px) 60vw, 35vw" : "(max-width: 760px) 30vw, (max-width: 900px) 25vw, 18vw"} unoptimized={image.src.includes(".supabase.co/")} />
            </div>)}
          </div>}
        </div>
      </div>

      <div className={styles.content}>
        <h5 className={styles.featureTitle}>Key features</h5>
        <div className={styles.features} aria-label={`${name} key features`}>
          <span><Users size={18} aria-hidden="true" />Up to {property.maxGuests} guests</span>
          <span><BedDouble size={18} aria-hidden="true" />{property.bedrooms} bedrooms · {property.beds} beds</span>
          <span><Bath size={18} aria-hidden="true" />{property.bathrooms} bathrooms</span>
          <span><DoorOpen size={18} aria-hidden="true" />Private home</span>
          {hasWifi && <span><Wifi size={18} aria-hidden="true" />Wi-Fi</span>}
          {hasKitchen && <span><CookingPot size={18} aria-hidden="true" />Kitchen</span>}
          {hasLaundry && <span><WashingMachine size={18} aria-hidden="true" />Laundry</span>}
          {hasHeatingCooling && <span><Snowflake size={18} aria-hidden="true" />Heating & cooling</span>}
          {property.parkingType && <span><Car size={18} aria-hidden="true" />Parking</span>}
        </div>

        <div className={styles.details}>
          <section>
            <h5><Wifi size={17} aria-hidden="true" />Amenities</h5>
            <p>{amenities.slice(0, 4).map((amenity) => corporateBookingWording(amenity.label)).join(" · ") || "Explore the features of this home."}</p>
            <Link href={`${href}#house-amenities`}>See amenities <ChevronRight size={14} aria-hidden="true" /></Link>
          </section>
          <section>
            <h5><KeyRound size={17} aria-hidden="true" />Check-in</h5>
            <p>{property.checkIn || "Arrival details are shared before your stay."}{property.checkout ? ` · Checkout ${property.checkout}` : ""}</p>
            <Link href={`${href}#house-checkin`}>Check-in details <ChevronRight size={14} aria-hidden="true" /></Link>
          </section>
          {property.corporateBookingAllowed && <section>
            <h5><DoorOpen size={17} aria-hidden="true" />Corporate bookings</h5>
            <p>{corporateBookingWording(property.corporateInformation || property.corporateInstructions || "Corporate bookings are available for approved partners.")}</p>
            <Link href="/corporate-stays#corporate-booking">Partner booking <ChevronRight size={14} aria-hidden="true" /></Link>
          </section>}
          <section>
            <h5><ClipboardList size={17} aria-hidden="true" />House rules</h5>
            <p>{property.houseRules.slice(0, 3).join(" · ") || "Review the house rules before booking."}</p>
            <Link href={`${href}#house-rules`}>Read house rules <ChevronRight size={14} aria-hidden="true" /></Link>
          </section>
          <section>
            <h5><Shield size={17} aria-hidden="true" />Guest safety</h5>
            <p>{safety.slice(0, 3).map((amenity) => amenity.label).join(" · ") || property.safetyInformation || "View safety information for this home."}</p>
            <Link href={`${href}#house-safety`}>Safety details <ChevronRight size={14} aria-hidden="true" /></Link>
          </section>
          <section>
            <h5><CalendarDays size={17} aria-hidden="true" />Booking & cancellation</h5>
            <p>Minimum {property.minimumStay} nights · Free until 11:59 pm Melbourne time, {property.freeCancellationDays} day{property.freeCancellationDays === 1 ? "" : "s"} before check-in. Then an A${property.lateCancellationFee} fee applies, capped at the booking price.</p>
            <Link href={`${href}#house-booking`}>Booking policy <ChevronRight size={14} aria-hidden="true" /></Link>
          </section>
          <section>
            <h5><Users size={17} aria-hidden="true" />Your host</h5>
            <p>{hostBio || "The Serenity team can help with questions about the house and your stay."}</p>
            <Link href="/about#your-host">About your host <ChevronRight size={14} aria-hidden="true" /></Link>
          </section>
          <Link className={styles.bookingCard} href={`${href}#availability`}>
            <span>READY WHEN YOU ARE</span>
            <strong>Book now</strong>
            <ArrowUpRight size={22} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function HomesPreviewRail({ properties }: { properties: Property[] }) {
  if (!properties.length) return null;

  return <section className={styles.section} aria-labelledby="homes-preview-title">
    <div className={styles.heading}>
      <div>
        <span className={styles.kicker}>Explore every home</span>
        <h2 id="homes-preview-title">A closer look at each house.</h2>
        <p>Compare the homes below, then open one for its full details and live availability.</p>
      </div>
      <nav className={styles.jumpLinks} aria-label="Choose a home preview">
        {properties.map((property) => <a key={property.id || property.slug} href={`#home-preview-${property.slug}`}>{displayName(property)}</a>)}
      </nav>
    </div>
    <div className={styles.rail}>
      {properties.map((property) => <HomePreview key={property.id || property.slug} property={property} />)}
    </div>
  </section>;
}
