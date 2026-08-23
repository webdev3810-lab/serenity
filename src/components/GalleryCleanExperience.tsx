"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Property, PropertyImage } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

type GalleryCleanExperienceProps = {
  properties: Property[];
};

type CleanGalleryPhoto = PropertyImage & {
  id: string;
  categoryLabel: string;
  categorySlug: string;
  categoryOrder: number;
  photoOrder: number;
};

type CleanGalleryCategory = {
  slug: string;
  label: string;
  description: string;
  order: number;
  images: CleanGalleryPhoto[];
};

const displayName = (name: string) => name.replace(/\s+-\s+Whole$/i, "");

const categorySlug = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "other";

const isUsableImage = (image: PropertyImage) =>
  Boolean(image.src && image.isVisible !== false && isApprovedHomepageMediaSource(image.src));

function photosFor(property: Property): CleanGalleryPhoto[] {
  return property.images.filter(isUsableImage).map((image, index) => {
    const label = image.categoryLabel?.trim() || image.category?.trim() || "Other";
    return {
      ...image,
      id: `${property.slug}-${index}-${image.src}`,
      categoryLabel: label,
      categorySlug: categorySlug(image.category?.trim() || label),
      categoryOrder: Number(image.categoryOrder ?? index),
      photoOrder: index,
    };
  });
}

function categoriesFor(photos: CleanGalleryPhoto[]): CleanGalleryCategory[] {
  const categories = new Map<string, CleanGalleryCategory>();

  photos.forEach((photo, index) => {
    const existing = categories.get(photo.categorySlug);
    if (existing) {
      existing.images.push(photo);
      existing.order = Math.min(existing.order, photo.categoryOrder);
      if (!existing.description && photo.categoryDescription?.trim()) existing.description = photo.categoryDescription.trim();
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
    .map((category) => ({ ...category, images: [...category.images].sort((a, b) => a.photoOrder - b.photoOrder) }));
}

function CleanGalleryLightbox({
  photos,
  index,
  houseName,
  onClose,
  onChange,
}: {
  photos: CleanGalleryPhoto[];
  index: number;
  houseName: string;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const photo = photos[index];
  const previous = useCallback(() => onChange((index - 1 + photos.length) % photos.length), [index, onChange, photos.length]);
  const next = useCallback(() => onChange((index + 1) % photos.length), [index, onChange, photos.length]);

  useEffect(() => {
    if (!photo) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && photos.length > 1) previous();
      if (event.key === "ArrowRight" && photos.length > 1) next();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [next, onClose, photo, photos.length, previous]);

  if (!photo) return null;

  return (
    <div className="gallery-clean-lightbox" role="dialog" aria-modal="true" aria-label={`${houseName} ${photo.categoryLabel} photo viewer`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="gallery-clean-lightbox-shell">
        <header className="gallery-clean-lightbox-header">
          <div>
            <p>{houseName}</p>
            <span>{photo.categoryLabel} · {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close photo viewer">Close <X size={17} aria-hidden="true" /></button>
        </header>
        <div className="gallery-clean-lightbox-stage">
          <button type="button" onClick={previous} disabled={photos.length < 2} aria-label="Previous photo"><ChevronLeft size={22} aria-hidden="true" /></button>
          <div className="gallery-clean-lightbox-image"><Image src={photo.src} alt={photo.alt} fill sizes="100vw" priority className="object-contain" /></div>
          <button type="button" onClick={next} disabled={photos.length < 2} aria-label="Next photo"><ChevronRight size={22} aria-hidden="true" /></button>
        </div>
        <footer className="gallery-clean-lightbox-footer">
          <p>{photo.alt}</p>
          <span>Use arrow keys or controls to browse</span>
        </footer>
      </div>
    </div>
  );
}

export default function GalleryCleanExperience({ properties }: GalleryCleanExperienceProps) {
  const availableProperties = useMemo(() => properties.filter((property) => property.images.some(isUsableImage)), [properties]);
  const photoMap = useMemo(() => new Map(availableProperties.map((property) => [property.slug, photosFor(property)])), [availableProperties]);
  const [selectedSlug, setSelectedSlug] = useState(availableProperties[0]?.slug ?? "");
  const [lightboxPhotos, setLightboxPhotos] = useState<CleanGalleryPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const selectedProperty = availableProperties.find((property) => property.slug === selectedSlug) ?? availableProperties[0];
  const selectedPhotos = useMemo(() => selectedProperty ? (photoMap.get(selectedProperty.slug) ?? []) : [], [photoMap, selectedProperty]);
  const selectedCategories = useMemo(() => categoriesFor(selectedPhotos), [selectedPhotos]);
  const cover = selectedPhotos.find((photo) => photo.isCover) ?? selectedPhotos[0];
  const houseName = selectedProperty ? displayName(selectedProperty.name) : "Serenity house";

  const openLightbox = useCallback((photos: CleanGalleryPhoto[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
  }, []);

  const chooseHouse = (slug: string) => {
    setSelectedSlug(slug);
    window.setTimeout(() => document.getElementById("gallery-clean-house")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), 0);
  };

  if (!availableProperties.length) {
    return (
      <section className="gallery-clean-empty">
        <p>Our gallery</p>
        <h1>Photos will appear here soon.</h1>
        <span>The gallery only shows approved images published through the Serenity admin.</span>
      </section>
    );
  }

  return (
    <div className="gallery-clean-experience">
      <section className="gallery-clean-hero" aria-labelledby="gallery-clean-title">
        <p>Serenity On The Rocks · Pakenham</p>
        <h1 id="gallery-clean-title">Our Gallery</h1>
        <div className="gallery-clean-hero-copy">
          <p>Explore each house room by room. Every image and category below follows the collection published from the Serenity admin.</p>
          <span>{availableProperties.length} houses · {availableProperties.reduce((total, property) => total + (photoMap.get(property.slug)?.length ?? 0), 0)} approved photographs</span>
        </div>
      </section>

      <nav className="gallery-clean-house-selector" aria-label="Choose a Serenity house">
        <span>Choose a house</span>
        <div>
          {availableProperties.map((property, index) => {
            const isSelected = property.slug === selectedProperty?.slug;
            return (
              <button key={property.slug} type="button" className={isSelected ? "is-active" : ""} aria-pressed={isSelected} onClick={() => chooseHouse(property.slug)}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <strong>{displayName(property.name)}</strong>
                <span>{photoMap.get(property.slug)?.length ?? 0} photos</span>
              </button>
            );
          })}
        </div>
      </nav>

      {selectedProperty ? (
        <>
          <section id="gallery-clean-house" className="gallery-clean-house" aria-labelledby="gallery-clean-house-title">
            <div className="gallery-clean-house-image">
              {cover ? <Image src={cover.src} alt={cover.alt} fill priority sizes="(max-width: 900px) 100vw, 54vw" className="object-cover" /> : null}
              <span>{String(selectedPhotos.length).padStart(2, "0")} photographs</span>
            </div>
            <div className="gallery-clean-house-copy">
              <p>{selectedProperty.location}</p>
              <h2 id="gallery-clean-house-title">{houseName}</h2>
              <div className="gallery-clean-house-facts" aria-label={`${houseName} facts`}>
                <span><b>{selectedProperty.bedrooms}</b> bedrooms</span>
                <span><b>{selectedProperty.maxGuests}</b> guests</span>
                <span><b>{selectedCategories.length}</b> room categories</span>
              </div>
              <p className="gallery-clean-house-description">{selectedProperty.shortDescription}</p>
              <div className="gallery-clean-house-actions">
                <Link href={`/properties/${selectedProperty.slug}`}>View house <ArrowUpRight size={15} aria-hidden="true" /></Link>
                <Link href={`/properties/${selectedProperty.slug}#availability`}>Check availability <ArrowUpRight size={15} aria-hidden="true" /></Link>
              </div>
            </div>
          </section>

          <nav className="gallery-clean-category-nav" aria-label={`${houseName} room categories`}>
            <div><span>Browse by room</span><strong>{selectedCategories.length} categories</strong></div>
            <div>
              {selectedCategories.map((category) => (
                <a key={category.slug} href={`#gallery-clean-${selectedProperty.slug}-${category.slug}`}>{category.label}<span>{category.images.length}</span></a>
              ))}
            </div>
          </nav>

          <div className="gallery-clean-categories">
            {selectedCategories.map((category, categoryIndex) => {
              const layoutClass = category.images.length === 1 ? "is-single" : category.images.length === 2 ? "is-pair" : "is-mosaic";
              return (
                <section key={category.slug} id={`gallery-clean-${selectedProperty.slug}-${category.slug}`} className="gallery-clean-category" aria-labelledby={`gallery-clean-title-${selectedProperty.slug}-${category.slug}`}>
                  <header className="gallery-clean-category-header">
                    <div><span>{String(categoryIndex + 1).padStart(2, "0")}</span><h3 id={`gallery-clean-title-${selectedProperty.slug}-${category.slug}`}>{category.label}</h3></div>
                    <div><strong>{category.images.length} {category.images.length === 1 ? "photograph" : "photographs"}</strong>{category.description ? <p>{category.description}</p> : null}</div>
                  </header>
                  <div className={`gallery-clean-grid ${layoutClass} count-${Math.min(category.images.length, 6)}`}>
                    {category.images.map((photo, photoIndex) => (
                      <button key={photo.id} type="button" className={photoIndex === 0 && category.images.length >= 3 ? "is-featured" : ""} onClick={() => openLightbox(category.images, photoIndex)} aria-label={`Open ${photo.alt || `${category.label} photo ${photoIndex + 1}`} in full screen`}>
                        <Image src={photo.src} alt={photo.alt} fill loading="lazy" sizes="(max-width: 700px) 94vw, (max-width: 1100px) 48vw, 32vw" className="object-cover" />
                        <span className="gallery-clean-grid-number">{String(photoIndex + 1).padStart(2, "0")}</span>
                        <span className="gallery-clean-grid-caption"><strong>{category.label}</strong><small>View larger</small></span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <section className="gallery-clean-cta" aria-labelledby="gallery-clean-cta-title">
            <p>Ready to choose?</p>
            <h2 id="gallery-clean-cta-title">Find your Serenity house.</h2>
            <div><Link href="/houses">View all houses <ArrowUpRight size={16} aria-hidden="true" /></Link><Link href="/contact">Ask a question <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          </section>
        </>
      ) : null}

      {lightboxPhotos.length ? (
        <CleanGalleryLightbox photos={lightboxPhotos} index={lightboxIndex} houseName={houseName} onClose={() => setLightboxPhotos([])} onChange={setLightboxIndex} />
      ) : null}
    </div>
  );
}
