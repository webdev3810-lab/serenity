"use client";
import { AmenityIcon } from "@/src/components/AmenityIcon";
import { PropertyReviews } from "@/src/components/PropertyReviews";
import { AMENITY_GROUPS,normalizeAmenities } from "@/src/lib/amenities";
import { aggregateReviews } from "@/src/lib/review-ratings";
import { normalizeRooms,roomBedLabel,roomPhoto,roomTotals } from "@/src/lib/rooms";
import { Bath,MapPin,Shield,Users } from "lucide-react";

import { BookingCard,MiniCalendar,RelatedHouses } from "@/src/components/BookingWidgets";
import { SerenityLocationMap } from "@/src/components/SerenityLocationMap";
import { Drawer,Modal,PublicDialog } from "@/src/components/UI";
import { useBooking } from "@/src/context/BookingContext";
import type { Property,PropertyImage } from "@/src/data/properties";
import { calculatePrice,defaultGuests,formatAud,validateDateRange } from "@/src/lib/booking";
import { BedDouble,CalendarDays,Car,ChevronLeft,ChevronRight,DoorOpen,Images,KeyRound,Star,X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect,useState } from "react";

const isRemotePreviewImage = (src: string) => src.includes("a0.muscache.com");

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
    const onKeyDown = (event: KeyboardEvent) => {

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
    <PublicDialog label="Property photo tour" className="property-photo-tour" onClose={onClose}>
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
            <div>
              <p className="property-photo-tour-kicker">Inside the house</p>
              <h3 id="property-photo-tour-heading">Explore every room.</h3>
            </div>
            <p className="property-photo-tour-browser-copy">
              Browse the home by space, then select any image to see it at full size.
            </p>
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
                <span className="property-photo-tour-category-nav-caption">
                  <span className="property-photo-tour-category-nav-label">{category.label}</span>
                  <span className="property-photo-tour-category-nav-count">{String(category.images.length).padStart(2, "0")}</span>
                </span>
              </button>
            ))}
          </nav>
        </section>

        {photoCategories.map((category, categoryIndex) => (
          <section key={category.slug} id={`photo-tour-category-${category.slug}`} className="property-photo-tour-category property-photo-tour-room-section" aria-labelledby={`photo-tour-category-title-${category.slug}`}>
            <header className="property-photo-tour-category-heading">
              <div className="property-photo-tour-category-name">
                <span className="property-photo-tour-category-index">{String(categoryIndex + 1).padStart(2, "0")}</span>
                <div>
                  <h4 id={`photo-tour-category-title-${category.slug}`}>{category.label}</h4>
                  <span>{category.images.length} {category.images.length === 1 ? "photo" : "photos"}</span>
                </div>
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
        <PublicDialog className="property-photo-lightbox" label={`Photo ${activeIndex + 1} of ${photos.length}`} onClose={() => setLightboxOpen(false)}>
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
        </PublicDialog>
      )}
    </PublicDialog>
  );
}

export function PropertyDetailPage({ property,relatedProperties,today }:{property:Property;relatedProperties?:Property[];today:string}) {
 const [galleryOpen,setGalleryOpen]=useState(false),[amenitiesOpen,setAmenitiesOpen]=useState(false),[drawerOpen,setDrawerOpen]=useState(false),[info,setInfo]=useState<{title:string;lines:string[]}|null>(null);
 const [blockedDates,setBlockedDates]=useState(property.unavailableDates),[availabilityLoading,setAvailabilityLoading]=useState(true),[availabilityError,setAvailabilityError]=useState("");const {booking,setBooking}=useBooking();
 const images=property.images.filter(i=>i.src&&i.isVisible!==false),name=property.listingTitle?.trim()||property.name.replace(/\s+-\s+Whole$/i,""),amenities=normalizeAmenities(property.amenities,property.amenityDetails),reviews=aggregateReviews(property.reviews??[]);
 const rooms=normalizeRooms(property.bedArrangements),totals=roomTotals(rooms),price=calculatePrice(property,booking.checkIn,booking.checkout,booking.guests??defaultGuests);
 const highlights=[{Icon:KeyRound,title:"Arrival",text:property.selfCheckInDetails},{Icon:Car,title:"Parking",text:property.parkingType},{Icon:CalendarDays,title:"Longer stays",text:property.longTermStaysAllowed?`${property.minimumStay}–${property.maximumStay} nights`:""}].filter(h=>h.text);
 const practical=[["Kitchen",property.kitchenFacilities],["Laundry",property.laundryFacilities],["Internet",property.wifiInformation],["Workspace",property.workspaceInformation],["Heating and cooling",property.heatingCooling]].filter(([,v])=>v);
 const know=[{title:"House rules",Icon:KeyRound,lines:[property.checkIn?`Check-in: ${property.checkIn}`:"",property.checkout?`Checkout: ${property.checkout}`:"",...property.houseRules,property.petPolicy].filter(Boolean)},{title:"Safety & property",Icon:Shield,lines:[property.safetyInformation].filter(Boolean) as string[]},{title:"Cancellation policy",Icon:CalendarDays,lines:[property.cancellationPolicy].filter(Boolean) as string[]}].filter(k=>k.lines.length);
 useEffect(()=>{let cancelled=false;fetch(`/api/properties/${property.slug}/availability`).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||"Availability unavailable");if(!cancelled){setBlockedDates(Array.isArray(data.blockedDates)?data.blockedDates:property.unavailableDates);setAvailabilityError(data.warning||"");}}).catch(()=>{if(!cancelled)setAvailabilityError("Live availability is temporarily unavailable. Dates will be checked again before booking.");}).finally(()=>{if(!cancelled)setAvailabilityLoading(false);});return()=>{cancelled=true;};},[property.slug,property.unavailableDates]);
 return <><div className="property-stay homepage-theme property-theme"><div className="stay-shell"><section className="property-editorial-heading"><Link href="/houses" className="stay-back"><ChevronLeft size={16}/>All houses</Link><header className="stay-heading"><p className="stay-eyebrow">{property.propertyType}</p><h1>{name}</h1><div className="stay-heading-meta">{reviews.count>0&&<a href="#reviews"><Star size={16} fill="currentColor"/>{reviews.average!.toFixed(2)} · {reviews.count} review{reviews.count===1?"":"s"}</a>}<a href="#location"><MapPin size={16}/>{property.location}</a></div></header></section>
 {images.length?<div className="stay-gallery" data-count={Math.min(images.length,5)}>{images.slice(0,5).map((image,i)=><button type="button" key={image.src+i} aria-label={`Open gallery: ${image.alt||`Photo ${i+1}`}`} className={i===0?"stay-gallery-main":""} onClick={()=>setGalleryOpen(true)}><Image src={image.src} alt={image.alt} fill priority={i===0} sizes={i===0?"(max-width:768px) 100vw, 50vw":"(max-width:768px) 50vw, 25vw"} unoptimized={isRemotePreviewImage(image.src)}/></button>)}<button type="button" className="stay-gallery-all" onClick={()=>setGalleryOpen(true)}><Images size={17}/>All {images.length} photos</button></div>:<div className="stay-gallery-empty">Photos will be added soon.</div>}
 <nav className="stay-section-nav" aria-label="Property sections"><a href="#about">The home</a>{rooms.length>0&&<a href="#sleep">Sleeping</a>}{amenities.length>0&&<a href="#amenities">Amenities</a>}<a href="#availability">Availability</a><a href="#reviews">Reviews</a><a href="#location">Location</a>{know.length>0&&<a href="#know">Things to know</a>}</nav>
 <div className="stay-body"><div className="stay-content"><section className="stay-section stay-intro" id="about"><h2>Your own place in {property.location.split(",")[0]}</h2><div className="stay-facts"><span><Users size={19}/>{property.maxGuests} guests</span><span><DoorOpen size={19}/>{totals?.bedrooms??property.bedrooms} bedrooms</span><span><BedDouble size={19}/>{totals?.beds??property.beds} beds</span><span><Bath size={19}/>{property.bathrooms} bathrooms</span></div><p className="stay-lead">{property.shortDescription}</p>{highlights.length>0&&<div className="stay-highlights">{highlights.map(({Icon,title,text})=><article key={title}><Icon size={24} strokeWidth={1.5}/><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>}<div className="stay-description"><h3>About this home</h3><p>{property.fullDescription}</p></div>{practical.length>0&&<details className="stay-practical"><summary>Practical details</summary>{practical.map(([label,value])=><div key={label}><h3>{label}</h3><p>{value}</p></div>)}</details>}</section>
 {rooms.length>0&&<section className="stay-section" id="sleep"><h2>Where you’ll sleep</h2><div className="stay-room-grid">{rooms.map((room,i)=>{const photo=roomPhoto(room,images);return <article key={room.room+i} className="stay-room-card">{photo?<div className="stay-room-photo"><Image src={photo} alt={room.room} fill sizes="(max-width:768px) 100vw, 25vw" unoptimized/></div>:<BedDouble size={30} strokeWidth={1.3}/>}<h3>{room.room}</h3><p>{roomBedLabel(room)}</p>{room.description&&<p>{room.description}</p>}</article>})}</div></section>}
 {amenities.length>0&&<section className="stay-section" id="amenities"><h2>What this place offers</h2><div className="stay-amenity-grid">{amenities.slice(0,10).map(a=><div key={a.id + a.label}><AmenityIcon icon={a.icon}/><span>{a.label}</span></div>)}</div><button type="button" className="stay-button" onClick={()=>setAmenitiesOpen(true)}>Show all {amenities.length} amenities</button></section>}
 <section className="stay-section" id="availability"><h2>Choose your dates</h2><p className="stay-helper">Prices are in AUD per night. Your checkout date is not charged.</p><MiniCalendar property={property} today={today} checkIn={booking.checkIn} checkout={booking.checkout} blockedDates={blockedDates} availabilityLoading={availabilityLoading} onCheckInSelect={a=>setBooking({propertySlug:property.slug,checkIn:a,checkout:""})} onSelect={(a,b)=>setBooking({propertySlug:property.slug,checkIn:a,checkout:b})}/>{availabilityError&&<p role="status" className="stay-error">{availabilityError}</p>}{booking.checkIn&&booking.checkout&&validateDateRange(property,booking.checkIn,booking.checkout,today,blockedDates)&&<p role="alert" className="stay-error">{validateDateRange(property,booking.checkIn,booking.checkout,today,blockedDates)}</p>}</section>
 </div><aside className="stay-desktop-booking"><BookingCard property={property} today={today} blockedDates={blockedDates} availabilityLoading={availabilityLoading}/></aside></div>
 <PropertyReviews reviews={property.reviews??[]}/>
 <section className="stay-section" id="location"><h2>Where you’ll be</h2><p>{property.location}</p>{property.nearbyLocations.length>0&&<div className="stay-nearby">{property.nearbyLocations.map(v=><span key={v}><MapPin size={16}/>{v}</span>)}</div>}<div className="stay-location-map"><SerenityLocationMap/></div></section>
 {know.length>0&&<section className="stay-section" id="know"><h2>Things to know</h2><div className="stay-know-grid">{know.map(({title,Icon,lines})=><article key={title}><Icon size={25}/><h3>{title}</h3><p>{lines[0]}</p><button type="button" className="stay-text-button" onClick={()=>setInfo({title,lines})}>Show details<ChevronRight size={16}/></button></article>)}</div></section>}
 {relatedProperties?.some(p=>p.slug!==property.slug)&&<section className="stay-section stay-related-homes"><h2>More Serenity homes</h2><RelatedHouses currentSlug={property.slug} properties={relatedProperties}/></section>}
 </div></div><div className="stay-mobile-reserve property-theme-mobile"><div><strong>{formatAud(price.nights?price.total:property.nightlyPrice)}</strong><span>{price.nights?`${price.nights} nights · total incl. fees & tax`:"Default rate / night · AUD"}</span></div><button type="button" className="stay-reserve-button" onClick={()=>setDrawerOpen(true)}>Check your stay</button></div><Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)}><BookingCard property={property} today={today} blockedDates={blockedDates} availabilityLoading={availabilityLoading}/></Drawer>
 <PhotoTour property={{...property,images}} open={galleryOpen} onClose={()=>setGalleryOpen(false)}/><Modal title="All amenities" open={amenitiesOpen} onClose={()=>setAmenitiesOpen(false)}><div className="stay-all-amenities">{Object.entries(AMENITY_GROUPS).map(([group,label])=>{const list=amenities.filter(a=>a.group===group);return list.length?<section key={group}><h3>{label}</h3>{list.map(a=><div key={a.id + a.label}><AmenityIcon icon={a.icon}/>{a.label}</div>)}</section>:null;})}</div></Modal><Modal title={info?.title??"Things to know"} open={!!info} onClose={()=>setInfo(null)}><div className="stay-policy">{info?.lines.map((line,i)=><p key={i}>{/^https:\/\/\S+$|^\/(?!\/)\S+$/.test(line)?<a href={line} className="underline">Read the applicable policy</a>:line}</p>)}</div></Modal></>;
}
