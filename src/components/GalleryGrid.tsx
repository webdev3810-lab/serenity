"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Car,
  ChevronLeft,
  ChevronRight,
  Dog,
  Images,
  PawPrint,
  Users,
  X,
} from "lucide-react";
import type { Property } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

type PhotoCategory = "Living areas" | "Bedrooms" | "Kitchens" | "Bathrooms" | "Outdoor spaces" | string;

type GalleryPhoto = {
  src: string;
  alt: string;
  propertyName: string;
  propertySlug: string;
  category: PhotoCategory;
  categorySlug: string;
};

type GalleryGridProps = {
  properties: Property[];
};

const defaultCategoryFilters: Array<{ label: PhotoCategory; slug: string }> = [
  { label: "Living areas", slug: "living-areas" },
  { label: "Bedrooms", slug: "bedrooms" },
  { label: "Kitchens", slug: "kitchens" },
  { label: "Bathrooms", slug: "bathrooms" },
  { label: "Outdoor spaces", slug: "outdoor-spaces" },
];

const displayName = (name: string) => name.replace(" - Whole", "");
const isPreviewImage = (src: string) => src.includes("a0.muscache.com");

function categoryFromAlt(alt: string): { label: PhotoCategory; slug: string } {
  const value = alt.toLowerCase();

  if (value.includes("bedroom")) return { label: "Bedrooms", slug: "bedrooms" };
  if (value.includes("kitchen")) return { label: "Kitchens", slug: "kitchens" };
  if (value.includes("bathroom")) return { label: "Bathrooms", slug: "bathrooms" };
  if (value.includes("exterior") || value.includes("outdoor") || value.includes("garden") || value.includes("yard")) {
    return { label: "Outdoor spaces", slug: "outdoor-spaces" };
  }
  return { label: "Living areas", slug: "living-areas" };
}

export default function GalleryGrid({ properties }: GalleryGridProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const photos = useMemo<GalleryPhoto[]>(() => {
    const seen = new Set<string>();

    return properties.flatMap((property) =>
      property.images.filter((image) => isApprovedHomepageMediaSource(image.src)).flatMap((image) => {
        if (!image.src || seen.has(image.src)) return [];
        seen.add(image.src);
        const category = image.categoryLabel ? { label: image.categoryLabel, slug: image.category ?? "other" } : categoryFromAlt(image.alt);
        return [{
          src: image.src,
          alt: image.alt,
          propertyName: property.name,
          propertySlug: property.slug,
          category: category.label,
          categorySlug: category.slug,
        }];
      }),
    );
  }, [properties]);

  const categoryFilters = useMemo(() => {
    const filters = new Map(defaultCategoryFilters.map((category) => [category.slug, category]));
    photos.forEach((photo) => {
      if (!filters.has(photo.categorySlug)) {
        filters.set(photo.categorySlug, { label: photo.category, slug: photo.categorySlug });
      }
    });
    return [...filters.values()].filter((category) => photos.some((photo) => photo.categorySlug === category.slug));
  }, [photos]);

  const visiblePhotos = useMemo(() => {
    if (activeFilter === "all") return photos;
    if (activeFilter.startsWith("property:")) {
      return photos.filter((photo) => photo.propertySlug === activeFilter.replace("property:", ""));
    }
    return photos.filter((photo) => photo.categorySlug === activeFilter.replace("category:", ""));
  }, [activeFilter, photos]);

  const propertySections = useMemo(() => properties.map((property, index) => ({
    property,
    index,
    photos: visiblePhotos.filter((photo) => photo.propertySlug === property.slug),
  })).filter((section) => section.photos.length > 0), [properties, visiblePhotos]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealItems = Array.from(root.querySelectorAll<HTMLElement>("[data-gallery-reveal]"));
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [activeFilter, propertySections.length]);

  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIndex(null);
      if (event.key === "ArrowLeft") {
        setSelectedIndex((current) => current === null ? null : (current - 1 + visiblePhotos.length) % visiblePhotos.length);
      }
      if (event.key === "ArrowRight") {
        setSelectedIndex((current) => current === null ? null : (current + 1) % visiblePhotos.length);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIndex, visiblePhotos.length]);

  const selectedPhoto = selectedIndex === null ? null : visiblePhotos[selectedIndex];
  const setFilter = (filter: string) => {
    setActiveFilter(filter);
    setSelectedIndex(null);
  };

  return (
    <div ref={rootRef} className="gallery-browser">
      <div className="gallery-filter-shell" aria-label="Filter gallery photos">
        <div className="gallery-filter-group" aria-label="Filter by house">
          <span className="gallery-filter-label">Houses</span>
          <div className="gallery-filter-list">
            <button type="button" className={`gallery-filter ${activeFilter === "all" ? "is-active" : ""}`} aria-pressed={activeFilter === "all"} onClick={() => setFilter("all")}>
              All photos <span>{photos.length}</span>
            </button>
            {properties.map((property) => {
              const filter = `property:${property.slug}`;
              const count = photos.filter((photo) => photo.propertySlug === property.slug).length;
              return (
                <button key={property.slug} type="button" className={`gallery-filter ${activeFilter === filter ? "is-active" : ""}`} aria-pressed={activeFilter === filter} onClick={() => setFilter(filter)}>
                  {displayName(property.name)} <span>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="gallery-filter-group" aria-label="Filter by space">
          <span className="gallery-filter-label">Spaces</span>
          <div className="gallery-filter-list">
            {categoryFilters.map((category) => {
              const filter = `category:${category.slug}`;
              const count = photos.filter((photo) => photo.categorySlug === category.slug).length;
              return (
                <button key={category.slug} type="button" className={`gallery-filter ${activeFilter === filter ? "is-active" : ""}`} aria-pressed={activeFilter === filter} onClick={() => setFilter(filter)}>
                  {category.label} <span>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="gallery-result-count" aria-live="polite">
        <Images size={16} aria-hidden="true" /> Showing {visiblePhotos.length} {visiblePhotos.length === 1 ? "photo" : "photos"}
      </p>

      {propertySections.length > 0 ? (
        <div className="gallery-property-sections">
          {propertySections.map(({ property, index, photos: propertyPhotos }) => (
            <section key={property.slug} className="gallery-property-section" data-gallery-reveal aria-labelledby={`gallery-property-${property.slug}`}>
              <div className="gallery-property-heading">
                <div className="gallery-property-copy">
                  <p className="gallery-property-kicker"><span>{String(index + 1).padStart(2, "0")}</span> Serenity house</p>
                  <h3 id={`gallery-property-${property.slug}`}>{displayName(property.name)}</h3>
                  <p>{property.shortDescription}</p>
                </div>
                <div className="gallery-property-actions">
                  <div className="gallery-property-stats" aria-label={`${displayName(property.name)} details`}>
                    <span><Users size={15} aria-hidden="true" /> Up to {property.maxGuests}</span>
                    <span><BedDouble size={15} aria-hidden="true" /> {property.bedrooms} bedrooms</span>
                    <span><Bath size={15} aria-hidden="true" /> {property.bathrooms} bathrooms</span>
                    {property.petsAllowed ? <span><Dog size={15} aria-hidden="true" /> Pet-friendly</span> : null}
                    <span><Car size={15} aria-hidden="true" /> {property.parkingType}</span>
                  </div>
                  <Link href={`/properties/${property.slug}`} className="gallery-house-cta">
                    View {displayName(property.name)} <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div className="gallery-editorial-grid">
                {propertyPhotos.map((photo, photoIndex) => {
                  const globalIndex = visiblePhotos.findIndex((item) => item.src === photo.src);
                  return (
                    <article key={`${photo.propertySlug}-${photo.src}`} className={`gallery-editorial-tile ${photoIndex === 0 ? "is-featured" : ""} ${photoIndex === 1 ? "is-wide" : ""}`} data-gallery-reveal>
                      <button type="button" className="gallery-tile-button" onClick={() => setSelectedIndex(globalIndex)}>
                        <Image
                          src={photo.src}
                          alt={photo.alt}
                          fill
                          unoptimized={isPreviewImage(photo.src)}
                          referrerPolicy={isPreviewImage(photo.src) ? "no-referrer" : undefined}
                          sizes={photoIndex === 0
                            ? "(max-width: 680px) 100vw, (max-width: 1100px) 58vw, 48vw"
                            : "(max-width: 680px) 100vw, (max-width: 1100px) 42vw, 25vw"}
                          className="gallery-tile-image"
                        />
                        <span className="gallery-tile-overlay" aria-hidden="true" />
                        <span className="gallery-editorial-caption">
                          <span>
                            <strong>{photo.category}</strong>
                            <small>{photo.alt}</small>
                          </span>
                          <span className="gallery-editorial-arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
                        </span>
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="gallery-empty" data-gallery-reveal>
          <PawPrint size={24} aria-hidden="true" />
          <p>No photos are available for this filter yet.</p>
          <button type="button" className="btn-secondary" onClick={() => setFilter("all")}>Show all photos</button>
        </div>
      )}

      {selectedPhoto && selectedIndex !== null ? (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${selectedPhoto.propertyName} photo viewer`} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedIndex(null);
        }}>
          <div className="gallery-lightbox-inner">
            <div className="gallery-lightbox-header">
              <div>
                <p className="gallery-lightbox-kicker">{displayName(selectedPhoto.propertyName)}</p>
                <p className="gallery-lightbox-count">{selectedPhoto.category} · {selectedIndex + 1} of {visiblePhotos.length}</p>
              </div>
              <button ref={closeButtonRef} type="button" className="gallery-lightbox-close" onClick={() => setSelectedIndex(null)} aria-label="Close photo viewer">
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <div className="gallery-lightbox-media">
              <Image
                src={selectedPhoto.src}
                alt={selectedPhoto.alt}
                fill
                priority
                unoptimized={isPreviewImage(selectedPhoto.src)}
                referrerPolicy={isPreviewImage(selectedPhoto.src) ? "no-referrer" : undefined}
                sizes="100vw"
                className="gallery-lightbox-image"
              />
              {visiblePhotos.length > 1 ? (
                <>
                  <button type="button" className="gallery-lightbox-arrow gallery-lightbox-prev" onClick={() => setSelectedIndex((selectedIndex - 1 + visiblePhotos.length) % visiblePhotos.length)} aria-label="Previous photo">
                    <ChevronLeft size={26} aria-hidden="true" />
                  </button>
                  <button type="button" className="gallery-lightbox-arrow gallery-lightbox-next" onClick={() => setSelectedIndex((selectedIndex + 1) % visiblePhotos.length)} aria-label="Next photo">
                    <ChevronRight size={26} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
            <div className="gallery-lightbox-footer">
              <p>{selectedPhoto.alt}</p>
              <Link href={`/properties/${selectedPhoto.propertySlug}`} onClick={() => setSelectedIndex(null)}>
                View house <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
