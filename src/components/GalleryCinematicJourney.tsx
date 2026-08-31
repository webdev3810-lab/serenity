"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Images, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Property, PropertyImage } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

type GalleryCinematicJourneyProps = {
  properties: Property[];
};

type JourneyPhoto = PropertyImage & {
  id: string;
  propertyName: string;
  propertySlug: string;
  categoryLabel: string;
  categorySlug: string;
  categoryOrder: number;
  photoOrder: number;
};

type JourneyCategory = {
  slug: string;
  label: string;
  description: string;
  order: number;
  images: JourneyPhoto[];
};

type JourneyProperty = {
  property: Property;
  photos: JourneyPhoto[];
  categories: JourneyCategory[];
  cover?: JourneyPhoto;
};

const displayName = (name: string) => name.replace(/\s+-\s+Whole$/i, "");

const categorySlug = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "other";

const isUsableImage = (image: PropertyImage) =>
  Boolean(image.src && image.isVisible !== false && isApprovedHomepageMediaSource(image.src));

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function photosFor(property: Property): JourneyPhoto[] {
  return property.images.filter(isUsableImage).map((image, index) => {
    const categoryLabel = image.categoryLabel?.trim() || image.category?.trim() || "Other";
    return {
      ...image,
      id: `${property.slug}-${index}-${image.src}`,
      propertyName: displayName(property.name),
      propertySlug: property.slug,
      categoryLabel,
      categorySlug: categorySlug(image.category?.trim() || categoryLabel),
      categoryOrder: Number(image.categoryOrder ?? index),
      photoOrder: index,
    };
  });
}

function categoriesFor(photos: JourneyPhoto[]): JourneyCategory[] {
  const categories = new Map<string, JourneyCategory>();

  photos.forEach((photo, index) => {
    const existing = categories.get(photo.categorySlug);
    if (existing) {
      existing.images.push(photo);
      existing.order = Math.min(existing.order, photo.categoryOrder);
      return;
    }

    categories.set(photo.categorySlug, {
      slug: photo.categorySlug,
      label: photo.categoryLabel,
      description: photo.categoryDescription?.trim() || "",
      order: Number(photo.categoryOrder ?? index),
      images: [photo],
    });
  });

  return [...categories.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((category) => ({ ...category, images: category.images.sort((a, b) => a.photoOrder - b.photoOrder) }));
}

function JourneyLightbox({
  photos,
  index,
  onClose,
  onChange,
}: {
  photos: JourneyPhoto[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const photo = photos[index];
  const previous = useCallback(() => onChange((index - 1 + photos.length) % photos.length), [index, onChange, photos.length]);
  const next = useCallback(() => onChange((index + 1) % photos.length), [index, onChange, photos.length]);

  useEffect(() => {
    if (!photo) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && photos.length > 1) previous();
      if (event.key === "ArrowRight" && photos.length > 1) next();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [next, onClose, photo, photos.length, previous]);

  if (!photo) return null;

  return (
    <div
      className="gallery-journey-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${photo.propertyName} ${photo.categoryLabel} photo viewer`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="gallery-journey-lightbox-inner">
        <header>
          <p>{photo.propertyName} <span>·</span> {photo.categoryLabel}</p>
          <button type="button" onClick={onClose} aria-label="Close photo viewer"><X size={20} /></button>
        </header>
        <div className="gallery-journey-lightbox-image">
          <Image src={photo.src} alt={photo.alt} fill sizes="100vw" priority className="object-contain" />
        </div>
        <footer>
          <button type="button" onClick={previous} disabled={photos.length < 2}><ArrowLeft size={17} /> Previous</button>
          <p>{photo.alt}</p>
          <button type="button" onClick={next} disabled={photos.length < 2}>Next <ArrowRight size={17} /></button>
        </footer>
      </div>
    </div>
  );
}

export default function GalleryCinematicJourney({ properties }: GalleryCinematicJourneyProps) {
  const journeyProperties = useMemo<JourneyProperty[]>(() => properties.flatMap((property) => {
    const photos = photosFor(property);
    if (!photos.length) return [];
    return [{
      property,
      photos,
      categories: categoriesFor(photos),
      cover: photos.find((photo) => photo.isCover) ?? photos[0],
    }];
  }), [properties]);
  const [lightboxPhotos, setLightboxPhotos] = useState<JourneyPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activePropertySlug, setActivePropertySlug] = useState(journeyProperties[0]?.property.slug ?? "");

  const openLightbox = useCallback((photos: JourneyPhoto[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const progressFor = (section: HTMLElement) => {
      const rect = section.getBoundingClientRect();
      return clamp(-rect.top / Math.max(1, section.offsetHeight - window.innerHeight));
    };

    const update = () => {
      const marker = window.innerHeight * 0.45;
      const propertySections = [...document.querySelectorAll<HTMLElement>("[data-gallery-property-slug]")];
      const activeProperty = propertySections.find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= marker && rect.bottom > marker;
      });
      if (activeProperty?.dataset.galleryPropertySlug) {
        const slug = activeProperty.dataset.galleryPropertySlug;
        setActivePropertySlug((current) => current === slug ? current : slug);
      }

      document.querySelectorAll<HTMLElement>("[data-gallery-house-scene]").forEach((section) => {
        const progress = media.matches ? 0.5 : progressFor(section);
        const reveal = clamp(progress * 3.1);
        const exit = clamp((1 - progress) * 3.1);
        section.style.setProperty("--journey-scale", String(1.1 - progress * 0.14));
        section.style.setProperty("--journey-image-y", `${(0.5 - progress) * 8}vh`);
        section.style.setProperty("--journey-title-x", `${(0.5 - progress) * 20}vw`);
        section.style.setProperty("--journey-copy-opacity", String(Math.min(reveal, exit)));
      });

      document.querySelectorAll<HTMLElement>("[data-gallery-marquee]").forEach((section) => {
        const progress = media.matches ? 0.5 : progressFor(section);
        section.querySelectorAll<HTMLElement>("[data-gallery-marquee-line]").forEach((line, index) => {
          const direction = index % 2 === 0 ? 1 : -1;
          line.style.transform = `translate3d(${direction * (0.5 - progress) * 27}vw, 0, 0)`;
        });
      });

      document.querySelectorAll<HTMLElement>("[data-gallery-room-scene]").forEach((section) => {
        const rect = section.getBoundingClientRect();
        const entrance = media.matches ? 1 : clamp((window.innerHeight - rect.top) / (window.innerHeight * 0.72));
        const titleReveal = clamp(entrance * 1.28);
        const copyReveal = clamp((entrance - 0.28) * 1.75);

        section.style.setProperty("--room-title-wipe", `${(1 - titleReveal) * 100}%`);
        section.style.setProperty("--room-title-y", `${(1 - titleReveal) * 3.5}rem`);
        section.style.setProperty("--room-meta-opacity", String(clamp(entrance * 1.6) * 0.72));
        section.style.setProperty("--room-copy-opacity", String(copyReveal));
        section.style.setProperty("--room-copy-y", `${(1 - copyReveal) * 2.2}rem`);

        section.querySelectorAll<HTMLElement>("[data-gallery-room-image]").forEach((image, index) => {
          const imageReveal = clamp((entrance - index * 0.055) * 1.35);
          image.style.setProperty("--room-image-wipe", `${(1 - imageReveal) * 100}%`);
          image.style.setProperty("--room-image-y", `${(1 - imageReveal) * 4.5}rem`);
          image.style.setProperty("--room-image-opacity", String(imageReveal));
        });
      });
    };

    const requestUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    media.addEventListener("change", requestUpdate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      media.removeEventListener("change", requestUpdate);
    };
  }, [journeyProperties]);

  if (!journeyProperties.length) {
    return (
      <section className="gallery-journey-empty">
        <Images size={28} aria-hidden="true" />
        <h2 className="font-marcellus">The gallery is being prepared.</h2>
        <p>Approved photos published from the admin will appear here.</p>
      </section>
    );
  }

  return (
    <div className="gallery-journey">
      <nav className="gallery-journey-skip" aria-label="Jump directly to a house gallery">
        <span>Jump to</span>
        {journeyProperties.map(({ property }) => {
          const name = displayName(property.name);
          const shortName = name.replace(/^Serenity\s+/i, "");
          return (
            <a
              key={`${property.slug}-jump`}
              href={`#gallery-${property.slug}`}
              className={activePropertySlug === property.slug ? "is-active" : ""}
              aria-current={activePropertySlug === property.slug ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                setActivePropertySlug(property.slug);
                document.getElementById(`gallery-${property.slug}`)?.scrollIntoView({
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                  block: "start",
                });
                window.history.replaceState(null, "", `#gallery-${property.slug}`);
              }}
            >
              <b>{shortName}</b><span>{name}</span>
            </a>
          );
        })}
      </nav>

      <section className="gallery-journey-chapter-card" aria-labelledby="gallery-houses-chapter">
        <p><span>Chapter two</span><span>The houses</span><span>(2)</span></p>
        <h2 id="gallery-houses-chapter" className="font-marcellus">Three houses.<br /><em>One calm address.</em></h2>
        <div>
          <p>Move through each Serenity home, then continue inside to see its rooms.</p>
          <span>Keep scrolling ↓</span>
        </div>
      </section>

      {journeyProperties.map(({ property, cover }, index) => {
        const name = displayName(property.name);
        return (
          <section
            key={property.slug}
            className={`gallery-journey-house gallery-journey-house-${index % 2 === 0 ? "left" : "right"}`}
            data-gallery-house-scene
            aria-labelledby={`gallery-journey-${property.slug}`}
          >
            <div className="gallery-journey-house-sticky">
              <div className="gallery-journey-house-image">
                {cover ? <Image src={cover.src} alt={cover.alt} fill sizes="100vw" className="object-cover" /> : null}
                <span className="gallery-journey-house-shade" />
              </div>
              <p className="gallery-journey-house-chapter"><span>{property.location}</span></p>
              <h2 id={`gallery-journey-${property.slug}`} className="font-marcellus gallery-journey-house-title">{name}</h2>
              <div className="gallery-journey-house-copy">
                <p>{property.shortDescription}</p>
                <div><span>{property.bedrooms} bedrooms</span><span>{property.maxGuests} guests</span></div>
                <Link href={`/properties/${property.slug}`}>Enter the house <ArrowUpRight size={16} aria-hidden="true" /></Link>
              </div>
            </div>
          </section>
        );
      })}

      <section className="gallery-journey-marquee" data-gallery-marquee aria-labelledby="gallery-inside-chapter">
        <p className="gallery-journey-marquee-meta"><span>Chapter three</span><span>Inside the houses</span><span>(3)</span></p>
        <h2 id="gallery-inside-chapter" className="font-marcellus">
          <span data-gallery-marquee-line>ROOM TO ARRIVE</span>
          <span data-gallery-marquee-line>ROOM TO BREATHE</span>
          <span data-gallery-marquee-line>ROOM TO STAY</span>
        </h2>
        <p className="gallery-journey-marquee-copy">Every room below is organised from the categories and photo order published in the Serenity admin.</p>
      </section>

      {journeyProperties.map(({ property, categories }, propertyIndex) => {
        const propertyName = displayName(property.name);
        return (
          <section
            key={`${property.slug}-rooms`}
            id={`gallery-${property.slug}`}
            className="gallery-journey-property"
            data-gallery-property-slug={property.slug}
            aria-labelledby={`gallery-property-${property.slug}`}
          >
            <header className="gallery-journey-property-intro">
              <p><span></span><span>{property.location}</span></p>
              <h2 id={`gallery-property-${property.slug}`} className="font-marcellus">Inside<br /><em>{propertyName}</em></h2>
              <div><p>{property.fullDescription}</p><Link href={`/properties/${property.slug}#availability`}>Check availability <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
            </header>

            {categories.map((category, categoryIndex) => {
              const layoutCount = Math.min(category.images.length, 5);
              const sceneStyle = { minHeight: category.images.length === 1 ? "150svh" : "165svh" } as CSSProperties;
              return (
                <section
                  key={`${property.slug}-${category.slug}`}
                  className={`gallery-journey-room gallery-journey-room-${(propertyIndex + categoryIndex) % 2 === 0 ? "light" : "dark"}`}
                  style={sceneStyle}
                  data-gallery-room-scene
                  aria-labelledby={`gallery-room-${property.slug}-${category.slug}`}
                >
                  <div className="gallery-journey-room-sticky">
                    <p className="gallery-journey-room-meta"><span>{propertyName}</span></p>
                    <h3 id={`gallery-room-${property.slug}-${category.slug}`} className="font-marcellus gallery-journey-room-title">{category.label}</h3>
                    <div className={`gallery-journey-room-images gallery-journey-room-images-${layoutCount}`}>
                      {category.images.map((photo, photoIndex) => (
                        <div
                          key={photo.id}
                          className="gallery-journey-room-image"
                          data-gallery-room-image
                        >
                          <button
                            type="button"
                            onClick={() => openLightbox(category.images, photoIndex)}
                            aria-label={`Open ${photo.alt} in full screen`}
                          >
                            <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 760px) 92vw, 72vw" className="object-cover" />
                            <span className="gallery-journey-room-image-shade" />
                            <span className="gallery-journey-room-image-caption">{photo.alt}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="gallery-journey-room-copy">
                      {category.description ? <p>{category.description}</p> : null}
                      <span><b>{category.images.length}</b> {category.images.length === 1 ? "photo" : "photos"}</span>
                    </div>
                  </div>
                </section>
              );
            })}
          </section>
        );
      })}

      <section className="gallery-journey-final" aria-labelledby="gallery-final-title">
        <p><span>Final chapter</span><span>Your stay</span><span>(4)</span></p>
        <h2 id="gallery-final-title" className="font-marcellus">Stay<br /><em>awhile.</em></h2>
        <div>
          <p>Choose the house that feels right, check your dates, and settle into Pakenham with room of your own.</p>
          <Link href="/houses">Explore the houses <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link href="/contact">Ask a question <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>

      {lightboxPhotos.length ? (
        <JourneyLightbox
          photos={lightboxPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxPhotos([])}
          onChange={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}
