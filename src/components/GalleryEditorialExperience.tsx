"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Images,
  MapPin,
  Maximize2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Property, PropertyImage } from "@/src/data/properties";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";

type GalleryEditorialExperienceProps = {
  properties: Property[];
};

type GalleryPhoto = PropertyImage & {
  id: string;
  propertySlug: string;
  propertyName: string;
  categorySlug: string;
  categoryLabel: string;
  categoryOrder: number;
  photoOrder: number;
  propertyOrder: number;
};

type GalleryCategory = {
  slug: string;
  label: string;
  description: string;
  order: number;
  images: GalleryPhoto[];
};

type SortMode = "house" | "room" | "name";

const displayName = (name: string) => name.replace(/\s+-\s+Whole$/i, "");

const categorySlug = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "other";

const isUsableImage = (image: PropertyImage) =>
  Boolean(image.src && image.isVisible !== false && isApprovedHomepageMediaSource(image.src));

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function photosFor(property: Property, propertyOrder = 0): GalleryPhoto[] {
  return property.images.filter(isUsableImage).map((image, index) => {
    const label = image.categoryLabel?.trim() || image.category?.trim() || "Other";
    return {
      ...image,
      id: `${property.slug}-${index}-${image.src}`,
      propertySlug: property.slug,
      propertyName: displayName(property.name),
      categorySlug: categorySlug(image.category?.trim() || label),
      categoryLabel: label,
      categoryOrder: Number(image.categoryOrder ?? index),
      photoOrder: index,
      propertyOrder,
    };
  });
}

function categoriesFor(photos: GalleryPhoto[]): GalleryCategory[] {
  const bySlug = new Map<string, GalleryCategory>();

  photos.forEach((image, index) => {
    const existing = bySlug.get(image.categorySlug);
    if (existing) {
      existing.images.push(image);
      existing.order = Math.min(existing.order, image.categoryOrder);
      return;
    }

    bySlug.set(image.categorySlug, {
      slug: image.categorySlug,
      label: image.categoryLabel,
      description: image.categoryDescription?.trim() || `A closer look at ${image.categoryLabel.toLowerCase()}.`,
      order: Number(image.categoryOrder ?? index),
      images: [image],
    });
  });

  return [...bySlug.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((category) => ({ ...category, images: category.images.slice(0, 5) }));
}

function coverFor(property: Property, photos: GalleryPhoto[]) {
  return photos.find((photo) => photo.isCover) ?? photos[0] ?? property.images.find(isUsableImage);
}

function formatPrice(value: number) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString("en-AU") : "—";
}

type HouseSelectorProps = {
  properties: Property[];
  selectedSlug: string;
  photoMap: Map<string, GalleryPhoto[]>;
  onSelect: (slug: string) => void;
};

function HouseSelector({ properties, selectedSlug, photoMap, onSelect }: HouseSelectorProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const previewSlug = hoveredSlug ?? selectedSlug;
  const previewProperty = properties.find((property) => property.slug === previewSlug) ?? properties[0];
  const previewPhotos = previewProperty ? (photoMap.get(previewProperty.slug) ?? []) : [];
  const previewCover = previewProperty ? coverFor(previewProperty, previewPhotos) : undefined;

  return (
    <section className="gallery-house-selector" aria-labelledby="gallery-house-selector-title">
      <div className="gallery-project-selector">
        <div className="gallery-project-preview">
          {previewCover ? (
            <Image
              key={previewCover.src}
              src={previewCover.src}
              alt={previewCover.alt}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 40vw"
              className="object-cover"
            />
          ) : <span className="gallery-house-card-no-photo">Photo coming soon</span>}
          <span className="gallery-project-preview-shade" />
          <span className="gallery-project-preview-caption"><strong>{previewProperty ? displayName(previewProperty.name) : "Serenity house"}</strong><small>{previewProperty?.location ?? "Pakenham, Victoria"}</small></span>
        </div>

        <div className="gallery-project-list">
          <div className="gallery-project-list-header">
            <div>
              <p className="gallery-editorial-overline">Choose a house</p>
              <h2 id="gallery-house-selector-title" className="font-marcellus gallery-project-list-title">Houses</h2>
            </div>
            <span className="gallery-project-list-link">View all</span>
          </div>
          <p className="gallery-project-list-intro">Each home has its own edited collection. Select a house to see its rooms and details.</p>
          <div className="gallery-project-list-items" role="list" aria-label="Serenity houses">
            {properties.map((property, index) => {
              const isSelected = selectedSlug === property.slug;
              const isPreview = previewProperty?.slug === property.slug;
              return (
                <button
                  key={property.slug}
                  type="button"
                  className={`gallery-project-row${isSelected ? " is-selected" : ""}${isPreview ? " is-preview" : ""}`}
                  aria-pressed={isSelected}
                  onMouseEnter={() => setHoveredSlug(property.slug)}
                  onMouseLeave={() => setHoveredSlug(null)}
                  onFocus={() => setHoveredSlug(property.slug)}
                  onClick={() => { setHoveredSlug(null); onSelect(property.slug); }}
                >

                  <span className="gallery-project-row-name">{displayName(property.name)}</span>
                  <span className="gallery-project-row-location">Pakenham</span>
                  <span className="gallery-project-row-dot" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          {previewProperty ? <p className="gallery-project-list-meta">{previewProperty.bedrooms} bedrooms <span aria-hidden="true">·</span> {previewProperty.maxGuests} guests <span aria-hidden="true">·</span> From AUD ${formatPrice(Number(previewProperty.nightlyPrice))}</p> : null}
        </div>
      </div>
    </section>
  );
}

type HorizontalEditorialGalleryProps = {
  eyebrow: string;
  title: string;
  description?: string;
  photos: GalleryPhoto[];
  onOpenPhoto: (photos: GalleryPhoto[], index: number) => void;
};

function HorizontalEditorialGallery({ eyebrow, title, description, photos, onOpenPhoto }: HorizontalEditorialGalleryProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef(0);
  const pointerProgressRef = useRef(0);
  const suppressClickRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [maxShift, setMaxShift] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const cardPosition = photos.length > 1 ? progress * (photos.length - 1) : 0;
  const stageExtra = Math.min(640, Math.max(0, (photos.length - 1) * 7));

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    setMaxShift(Math.max(0, track.scrollWidth - viewport.clientWidth));
  }, []);

  useLayoutEffect(() => {
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer && trackRef.current) observer.observe(trackRef.current);
    if (observer && viewportRef.current) observer.observe(viewportRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, photos.length]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const updateProgress = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const range = Math.max(1, section.offsetHeight - window.innerHeight);
      setProgress(clamp(-rect.top / range));
    };
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateProgress);
    };
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [photos.length]);

  const goTo = useCallback((nextIndex: number) => {
    if (photos.length < 2) return;
    const target = clamp(nextIndex / (photos.length - 1));
    const section = sectionRef.current;
    if (!section) return;
    const sectionTop = window.scrollY + section.getBoundingClientRect().top;
    const range = Math.max(0, section.offsetHeight - window.innerHeight);
    window.scrollTo({ top: sectionTop + target * range, behavior: reducedMotion ? "auto" : "smooth" });
  }, [photos.length, reducedMotion]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (photos.length < 2) return;
    pointerStartRef.current = event.clientX;
    pointerProgressRef.current = progress;
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || photos.length < 2 || maxShift <= 0) return;
    const delta = event.clientX - pointerStartRef.current;
    if (Math.abs(delta) > 6) suppressClickRef.current = true;
    setProgress(clamp(pointerProgressRef.current - delta / maxShift));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (suppressClickRef.current) window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  };

  if (!photos.length) return null;

  return (
    <section
      ref={sectionRef}
      className="gallery-horizontal-stage"
      style={{ "--gallery-stage-extra": `${stageExtra}svh` } as CSSProperties}
      aria-labelledby={`gallery-stage-${eyebrow.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
    >
      <div className="gallery-horizontal-sticky">
        <div className="gallery-horizontal-header">
          <div>
            <p className="gallery-editorial-overline">{eyebrow}</p>
            <h3 id={`gallery-stage-${eyebrow.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="font-marcellus gallery-horizontal-title">{title}</h3>
          </div>
          {description ? <p className="gallery-horizontal-description">{description}</p> : null}
        </div>

        <div
          ref={viewportRef}
          className={`gallery-horizontal-viewport${photos.length > 1 ? " is-draggable" : ""}`}
          role="region"
          aria-label={`${title} photo gallery`}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") { event.preventDefault(); goTo(Math.max(0, Math.round(cardPosition) - 1)); }
            if (event.key === "ArrowRight") { event.preventDefault(); goTo(Math.min(photos.length - 1, Math.round(cardPosition) + 1)); }
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            ref={trackRef}
            className="gallery-horizontal-track"
            style={{ transform: reducedMotion ? "translate3d(0, 0, 0)" : `translate3d(-${progress * maxShift}px, 0, 0)` }}
          >
            {photos.map((photo, index) => {
              const distance = Math.abs(index - cardPosition);
              const scale = Math.max(0.94, 1 - distance * 0.025);
              const opacity = Math.max(0.46, 1 - distance * 0.18);
              return (
                <button
                  key={photo.id}
                  type="button"
                  className="gallery-horizontal-card"
                  style={{ opacity, transform: `scale(${scale})` }}
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    onOpenPhoto(photos, index);
                  }}
                  aria-label={`Open ${photo.alt || `${title} photo ${index + 1}`} in full screen`}
                >
                  <span className="gallery-horizontal-card-image">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      priority={index === 0}
                      loading={index === 0 ? "eager" : "lazy"}
                      sizes="(max-width: 760px) 82vw, min(70vw, 68rem)"
                      className="object-cover"
                    />
                    <span className="gallery-horizontal-card-shade" />
                    <span className="gallery-horizontal-card-caption">
                      <span>{photo.categoryLabel}</span>
                      
                    </span>
                    <span className="gallery-horizontal-card-open"><Maximize2 size={16} aria-hidden="true" /></span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="gallery-horizontal-footer">
          <div className="gallery-horizontal-progress" aria-hidden="true"><span style={{ width: `${Math.max(4, progress * 100)}%` }} /></div>
          <p>{photos.length > 1 ? "Scroll, drag or use the arrows to explore" : "One approved photo in this collection"}</p>
          <div className="gallery-horizontal-controls">
            <button type="button" onClick={() => goTo(Math.max(0, Math.round(cardPosition) - 1))} disabled={photos.length < 2 || cardPosition <= 0.1} aria-label="Previous gallery photo"><ChevronLeft size={18} /></button>
            <span></span>
            <button type="button" onClick={() => goTo(Math.min(photos.length - 1, Math.round(cardPosition) + 1))} disabled={photos.length < 2 || cardPosition >= photos.length - 1.1} aria-label="Next gallery photo"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

type PhotoGridProps = {
  photos: GalleryPhoto[];
  onOpenPhoto: (photos: GalleryPhoto[], index: number) => void;
};

function PhotoGrid({ photos, onOpenPhoto }: PhotoGridProps) {
  const [activeHouse, setActiveHouse] = useState("all");
  const [activeRoom, setActiveRoom] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("house");

  const houses = useMemo(() => [...new Map(photos.map((photo) => [photo.propertySlug, photo.propertyName])).entries()], [photos]);
  const rooms = useMemo(() => {
    const roomMap = new Map<string, { slug: string; label: string; order: number }>();
    photos.filter((photo) => activeHouse === "all" || photo.propertySlug === activeHouse).forEach((photo) => {
      const current = roomMap.get(photo.categorySlug);
      if (!current || photo.categoryOrder < current.order) roomMap.set(photo.categorySlug, { slug: photo.categorySlug, label: photo.categoryLabel, order: photo.categoryOrder });
    });
    return [...roomMap.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [activeHouse, photos]);

  const visiblePhotos = useMemo(() => [...photos]
    .filter((photo) => activeHouse === "all" || photo.propertySlug === activeHouse)
    .filter((photo) => activeRoom === "all" || photo.categorySlug === activeRoom)
    .sort((a, b) => {
      if (sortMode === "name") return a.alt.localeCompare(b.alt);
      if (sortMode === "room") return a.categoryOrder - b.categoryOrder || a.propertyOrder - b.propertyOrder || a.photoOrder - b.photoOrder;
      return a.propertyOrder - b.propertyOrder || a.categoryOrder - b.categoryOrder || a.photoOrder - b.photoOrder;
    }), [activeHouse, activeRoom, photos, sortMode]);

  const chooseHouse = (slug: string) => {
    setActiveHouse(slug);
    setActiveRoom("all");
  };

  return (
    <section className="gallery-photo-grid-section" aria-labelledby="gallery-photo-grid-title">
      <div className="gallery-editorial-section-heading">
        <div>
          <p className="gallery-editorial-overline">The complete collection</p>
          <h2 id="gallery-photo-grid-title" className="font-marcellus gallery-editorial-section-title">Browse every room.</h2>
        </div>
        <p className="gallery-editorial-section-note">Filter the saved house library by property or room. The order follows the photo manager.</p>
      </div>

      <div className="gallery-photo-grid-controls">
        <div className="gallery-photo-grid-filter-block">
          <span className="gallery-editorial-control-label">House</span>
          <div className="gallery-editorial-controls" role="group" aria-label="Filter gallery by house">
            <button type="button" onClick={() => chooseHouse("all")} className={activeHouse === "all" ? "is-active" : ""} aria-pressed={activeHouse === "all"}>All houses</button>
            {houses.map(([slug, name]) => <button key={slug} type="button" onClick={() => chooseHouse(slug)} className={activeHouse === slug ? "is-active" : ""} aria-pressed={activeHouse === slug}>{name}</button>)}
          </div>
        </div>
        <div className="gallery-photo-grid-filter-block">
          <span className="gallery-editorial-control-label">Room</span>
          <div className="gallery-editorial-controls" role="group" aria-label="Filter gallery by room">
            <button type="button" onClick={() => setActiveRoom("all")} className={activeRoom === "all" ? "is-active" : ""} aria-pressed={activeRoom === "all"}>All rooms</button>
            {rooms.map((room) => <button key={room.slug} type="button" onClick={() => setActiveRoom(room.slug)} className={activeRoom === room.slug ? "is-active" : ""} aria-pressed={activeRoom === room.slug}>{room.label}</button>)}
          </div>
        </div>
        <label className="gallery-photo-grid-sort">
          <span className="gallery-editorial-control-label">Sort photos</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="house">By house</option>
            <option value="room">By room</option>
            <option value="name">By photo name</option>
          </select>
        </label>
      </div>

      <p className="gallery-photo-grid-count" aria-live="polite">Showing {visiblePhotos.length} {visiblePhotos.length === 1 ? "photo" : "photos"}</p>
      {visiblePhotos.length ? (
        <div className="gallery-editorial-grid">
          {visiblePhotos.map((photo, index) => (
            <button key={photo.id} type="button" className="gallery-editorial-grid-card" onClick={() => onOpenPhoto(visiblePhotos, index)} aria-label={`Open ${photo.alt || "gallery photo"} in full screen`}>
              <span className="gallery-editorial-grid-image">
                <Image src={photo.src} alt={photo.alt} fill loading="lazy" sizes="(max-width: 760px) 92vw, (max-width: 1100px) 46vw, 30vw" className="object-cover" />

                <span className="gallery-editorial-grid-open"><Maximize2 size={15} aria-hidden="true" /></span>
              </span>
              <span className="gallery-editorial-grid-copy"><strong>{photo.propertyName}</strong><span>{photo.categoryLabel}</span></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="gallery-editorial-empty">No approved photos match those filters yet.</div>
      )}
    </section>
  );
}

type LightboxProps = {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
};

function Lightbox({ photos, index, onClose, onChange }: LightboxProps) {
  const photo = photos[index];
  const previous = () => onChange((index - 1 + photos.length) % photos.length);
  const next = () => onChange((index + 1) % photos.length);

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
  });

  if (!photo) return null;

  return (
    <div className="gallery-editorial-lightbox" role="dialog" aria-modal="true" aria-label={`${photo.propertyName} photo viewer`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="gallery-editorial-lightbox-inner">
        <div className="gallery-editorial-lightbox-top"><p>{photo.propertyName} <span aria-hidden="true">·</span> {photo.categoryLabel}</p><button type="button" onClick={onClose} aria-label="Close photo viewer"><X size={20} /></button></div>
        <div className="gallery-editorial-lightbox-image"><Image src={photo.src} alt={photo.alt} fill sizes="100vw" priority className="object-contain" /></div>
        <div className="gallery-editorial-lightbox-bottom"><button type="button" onClick={previous} disabled={photos.length < 2}><ArrowLeft size={17} /> Previous</button><p>{photo.alt}</p><button type="button" onClick={next} disabled={photos.length < 2}>Next <ArrowRight size={17} /></button></div>
      </div>
    </div>
  );
}

export default function GalleryEditorialExperience({ properties }: GalleryEditorialExperienceProps) {
  const availableProperties = useMemo(() => properties.filter((property) => property.images.some(isUsableImage)), [properties]);
  const photoMap = useMemo(() => new Map(availableProperties.map((property, propertyOrder) => [property.slug, photosFor(property, propertyOrder)])), [availableProperties]);
  const allPhotos = useMemo(() => availableProperties.flatMap((property) => photoMap.get(property.slug) ?? []), [availableProperties, photoMap]);
  const [selectedSlug, setSelectedSlug] = useState(availableProperties[0]?.slug ?? "");
  const [lightboxPhotos, setLightboxPhotos] = useState<GalleryPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const selectedProperty = availableProperties.find((property) => property.slug === selectedSlug) ?? availableProperties[0];
  const selectedPhotos = useMemo(() => selectedProperty ? (photoMap.get(selectedProperty.slug) ?? []) : [], [photoMap, selectedProperty]);
  const selectedCategories = useMemo(() => categoriesFor(selectedPhotos), [selectedPhotos]);

  const chooseHouse = (slug: string) => {
    setSelectedSlug(slug);
    window.setTimeout(() => document.getElementById("gallery-rooms")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const openLightbox = useCallback((photos: GalleryPhoto[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
  }, []);

  if (!availableProperties.length) {
    return <div className="gallery-editorial-empty gallery-editorial-empty-large"><Images size={28} aria-hidden="true" /><h2 className="font-marcellus">Photos will appear here soon.</h2><p>The gallery only shows approved house photos saved through the admin photo manager.</p></div>;
  }

  return (
    <div className="gallery-editorial-experience">
      <HouseSelector properties={availableProperties} selectedSlug={selectedProperty?.slug ?? ""} photoMap={photoMap} onSelect={chooseHouse} />

      {selectedProperty ? (
        <section id="gallery-rooms" className="gallery-selected-house" aria-labelledby="gallery-selected-house-title">
          <div className="gallery-selected-house-copy">
            <div>
              <p className="gallery-editorial-overline"><MapPin size={13} aria-hidden="true" /> {selectedProperty.location}</p>
              <h2 id="gallery-selected-house-title" className="font-marcellus gallery-selected-house-title">{displayName(selectedProperty.name)}</h2>
              <p className="gallery-selected-house-description">{selectedProperty.shortDescription}</p>
              <div className="gallery-selected-house-actions"><Link href={`/properties/${selectedProperty.slug}`} className="gallery-editorial-primary-button">View house <ArrowUpRight size={16} aria-hidden="true" /></Link><Link href={`/properties/${selectedProperty.slug}#availability`} className="gallery-editorial-secondary-button">Check availability <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
            </div>
            <div className="gallery-selected-house-facts" aria-label={`${displayName(selectedProperty.name)} facts`}><div><strong>From AUD ${formatPrice(Number(selectedProperty.nightlyPrice))}</strong><span>per night</span></div><div><strong>{selectedProperty.bedrooms}</strong><span>bedrooms</span></div><div><strong>{selectedProperty.maxGuests}</strong><span>guests</span></div></div>
          </div>

          <nav className="gallery-category-nav" aria-label={`${displayName(selectedProperty.name)} photo categories`}><a href="#gallery-all-photos" className="is-active">All photos <span>{selectedPhotos.length}</span></a>{selectedCategories.map((category) => <a key={category.slug} href={`#gallery-category-${category.slug}`}>{category.label} <span>{category.images.length}</span></a>)}</nav>

          <div id="gallery-all-photos" className="gallery-editorial-anchor" aria-hidden="true" />
          <HorizontalEditorialGallery eyebrow={`${displayName(selectedProperty.name)} · all photos`} title="The house, in full." description="Move through the approved photo collection, then open any image for a closer look." photos={selectedPhotos} onOpenPhoto={openLightbox} />
          {selectedCategories.map((category) => <div key={category.slug} id={`gallery-category-${category.slug}`} className="gallery-category-stage"><HorizontalEditorialGallery eyebrow={`${displayName(selectedProperty.name)} · ${category.label}`} title={category.label} description={category.description} photos={category.images} onOpenPhoto={openLightbox} /></div>)}
        </section>
      ) : null}

      <PhotoGrid photos={allPhotos} onOpenPhoto={openLightbox} />

      {lightboxPhotos.length ? <Lightbox photos={lightboxPhotos} index={lightboxIndex} onClose={() => setLightboxPhotos([])} onChange={setLightboxIndex} /> : null}
    </div>
  );
}
