"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Images, MapPin, X } from "lucide-react";
import type { Property, PropertyImage } from "@/src/data/properties";

type PropertyGalleryExperienceProps = {
  properties: Property[];
};

type GalleryCategory = {
  slug: string;
  label: string;
  images: PropertyImage[];
  order: number;
};

const displayName = (name: string) => name.replace(" - Whole", "");

const categorySlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "other";

const isUsableImage = (image: PropertyImage) => Boolean(image.src && !image.src.includes("a0.muscache.com") && !image.src.includes("images.unsplash.com"));

function categoriesFor(property: Property): GalleryCategory[] {
  const bySlug = new Map<string, GalleryCategory>();

  property.images.filter(isUsableImage).forEach((image, index) => {
    const slug = categorySlug(image.category ?? image.categoryLabel ?? "other");
    const label = image.categoryLabel?.trim() || "Other";
    const current = bySlug.get(slug);
    if (current) {
      current.images.push(image);
      current.order = Math.min(current.order, Number(image.categoryOrder ?? index));
    } else {
      bySlug.set(slug, { slug, label, images: [image], order: Number(image.categoryOrder ?? index) });
    }
  });

  return [...bySlug.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export default function PropertyGalleryExperience({ properties }: PropertyGalleryExperienceProps) {
  const availableProperties = useMemo(() => properties.filter((property) => property.images.some(isUsableImage)), [properties]);
  const [selectedSlug, setSelectedSlug] = useState(availableProperties[0]?.slug ?? "");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const selectedProperty = availableProperties.find((property) => property.slug === selectedSlug) ?? availableProperties[0];
  const categories = useMemo(() => selectedProperty ? categoriesFor(selectedProperty) : [], [selectedProperty]);
  const category = categories.find((item) => item.slug === selectedCategory);
  const visiblePhotos = category?.images ?? selectedProperty?.images.filter(isUsableImage) ?? [];
  const activePhoto = visiblePhotos[activeIndex] ?? visiblePhotos[0];
  const coverPhoto = selectedProperty?.images.find((image) => image.isCover && isUsableImage(image)) ?? selectedProperty?.images.find(isUsableImage);
  const motion = reducedMotion ? "" : "transition duration-500 ease-out";

  const showPrevious = useCallback(() => {
    if (visiblePhotos.length < 2) return;
    setActiveIndex((current) => (current - 1 + visiblePhotos.length) % visiblePhotos.length);
  }, [visiblePhotos.length]);

  const showNext = useCallback(() => {
    if (visiblePhotos.length < 2) return;
    setActiveIndex((current) => (current + 1) % visiblePhotos.length);
  }, [visiblePhotos.length]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!lightboxOpen || !activePhoto) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePhoto, lightboxOpen, showNext, showPrevious]);

  if (!availableProperties.length) {
    return <div className="mx-auto max-w-4xl rounded-none border border-dashed border-[#B99D88] bg-[#F7F4F1] px-6 py-16 text-center text-stone-600"><Images className="mx-auto mb-4 text-[#8B6B55]" size={28} /><h2 className="text-2xl font-semibold text-[#2D2622]">Photos will appear here soon.</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed">The Serenity gallery is ready for real house photos. No preview or placeholder images are shown publicly.</p></div>;
  }

  const selectHouse = (slug: string) => {
    setSelectedSlug(slug);
    setSelectedCategory("all");
    setActiveIndex(0);
    setLightboxOpen(false);
  };

  const selectCategory = (slug: string) => {
    setSelectedCategory(slug);
    setActiveIndex(0);
    setLightboxOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
      <div className="overflow-hidden rounded-none border border-[#D8CCC4] bg-white shadow-[0_18px_60px_rgba(90,70,58,0.09)]">
        <div className="border-b border-[#EAE1DD] bg-[#F7F4F1] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Choose a house">
            {availableProperties.map((property) => {
              const active = property.slug === selectedProperty?.slug;
              return <button key={property.slug} type="button" onClick={() => selectHouse(property.slug)} aria-pressed={active} className={`shrink-0 rounded-none border px-4 py-2 text-sm font-bold ${active ? "border-[#5A463A] bg-[#5A463A] text-white" : "border-[#D8CCC4] bg-white text-[#5A463A] hover:bg-[#EAE1DD]"}`}>{displayName(property.name)}</button>;
            })}
          </div>
        </div>

        {selectedProperty && activePhoto && coverPhoto ? <>
          <header className="grid gap-5 border-b border-[#EAE1DD] px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#8B6B55]"><MapPin size={14} /> {selectedProperty.location}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#2D2622] sm:text-4xl">{displayName(selectedProperty.name)}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">{selectedProperty.shortDescription}</p>
              <p className="mt-3 text-sm font-bold text-[#5A463A]">From AUD ${Number(selectedProperty.nightlyPrice).toFixed(0)} per night</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link href={`/properties/${selectedProperty.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-none bg-[#2D2622] px-5 text-sm font-bold text-white hover:bg-[#5A463A]">View house <ArrowUpRight size={16} /></Link>
              <Link href={`/properties/${selectedProperty.slug}#availability`} className="inline-flex min-h-11 items-center gap-2 rounded-none border border-[#5A463A] px-5 text-sm font-bold text-[#5A463A] hover:bg-[#F7F4F1]">Check availability <ArrowUpRight size={16} /></Link>
            </div>
          </header>

          <div className="border-b border-[#EAE1DD] px-5 py-4 sm:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Filter photos by category">
              <button type="button" onClick={() => selectCategory("all")} aria-pressed={selectedCategory === "all"} className={`shrink-0 rounded-none px-4 py-2 text-sm font-bold ${selectedCategory === "all" ? "bg-[#EAE1DD] text-[#2D2622]" : "text-stone-600 hover:bg-[#F7F4F1]"}`}>All <span className="ml-1 text-xs opacity-65">{selectedProperty.images.filter(isUsableImage).length}</span></button>
              {categories.map((item) => <button key={item.slug} type="button" onClick={() => selectCategory(item.slug)} aria-pressed={selectedCategory === item.slug} className={`shrink-0 rounded-none px-4 py-2 text-sm font-bold ${selectedCategory === item.slug ? "bg-[#EAE1DD] text-[#2D2622]" : "text-stone-600 hover:bg-[#F7F4F1]"}`}>{item.label} <span className="ml-1 text-xs opacity-65">{item.images.length}</span></button>)}
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_190px] lg:p-8">
            <div className="relative min-w-0">
              <button type="button" onClick={() => setLightboxOpen(true)} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-none bg-[#EAE1DD] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A463A] focus-visible:ring-offset-2 sm:aspect-[16/10]" aria-label={`Open ${activePhoto.alt || "selected house photo"} in full screen`}>
                <Image src={activePhoto.src} alt={activePhoto.alt} fill priority={activeIndex === 0} sizes="(max-width: 1024px) 100vw, calc(100vw - 330px)" className={`object-cover ${motion} group-hover:scale-[1.02]`} />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/65 to-transparent px-4 pb-4 pt-16 text-white sm:px-6 sm:pb-6"><span><strong className="block text-sm sm:text-base">{category?.label ?? "All photos"}</strong><span className="mt-1 block max-w-xl text-xs text-white/80 sm:text-sm">{activePhoto.alt || `${displayName(selectedProperty.name)} photo`}</span></span><span className="shrink-0 rounded-none bg-black/40 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">{activeIndex + 1} / {visiblePhotos.length}</span></span>
              </button>
              {visiblePhotos.length > 1 && <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between pointer-events-none"><button type="button" onClick={showPrevious} className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-none bg-white/90 text-[#2D2622] shadow-lg hover:bg-white" aria-label="Previous photo"><ChevronLeft size={20} /></button><button type="button" onClick={showNext} className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-none bg-white/90 text-[#2D2622] shadow-lg hover:bg-white" aria-label="Next photo"><ChevronRight size={20} /></button></div>}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 lg:max-h-[440px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden" aria-label="Photo previews">
              {visiblePhotos.map((photo, index) => <button key={`${photo.src}-${index}`} type="button" onClick={() => setActiveIndex(index)} aria-label={`Show photo ${index + 1} of ${visiblePhotos.length}`} aria-pressed={index === activeIndex} className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-none border-2 text-left sm:h-24 sm:w-36 lg:h-24 lg:w-full ${index === activeIndex ? "border-[#5A463A]" : "border-transparent opacity-75 hover:opacity-100"}`}><Image src={photo.src} alt="" fill sizes="(max-width: 1024px) 144px, 190px" loading={index < 3 ? "eager" : "lazy"} className="object-cover" />{photo.isCover && <span className="absolute bottom-1 left-1 rounded-none bg-[#2D2622]/80 px-1.5 py-1 text-[0.6rem] font-bold text-white">Cover</span>}</button>)}
            </div>
          </div>
        </> : <div className="p-10 text-center text-sm text-stone-600">No visible photos are available for this house.</div>}
      </div>

      {lightboxOpen && activePhoto && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E1916]/95 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`${displayName(selectedProperty?.name ?? "House")} photo viewer`} onMouseDown={(event) => { if (event.target === event.currentTarget) setLightboxOpen(false); }}><div className="relative flex h-full w-full max-w-6xl flex-col"><div className="flex items-center justify-between gap-3 pb-3 text-white"><p className="text-sm font-bold">{category?.label ?? "All photos"} · {activeIndex + 1} of {visiblePhotos.length}</p><button type="button" onClick={() => setLightboxOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-none border border-white/25 hover:bg-white/10" aria-label="Close photo viewer"><X size={20} /></button></div><div className="relative flex min-h-0 flex-1 items-center justify-center"><Image src={activePhoto.src} alt={activePhoto.alt} fill sizes="100vw" className="object-contain" priority /></div><div className="flex items-center justify-between gap-3 pt-3 text-white"><button type="button" onClick={showPrevious} className="inline-flex min-h-11 items-center gap-2 rounded-none border border-white/25 px-4 hover:bg-white/10" disabled={visiblePhotos.length < 2}><ArrowLeft size={17} /> Previous</button><p className="hidden max-w-xl truncate text-center text-xs text-white/70 sm:block">{activePhoto.alt}</p><button type="button" onClick={showNext} className="inline-flex min-h-11 items-center gap-2 rounded-none border border-white/25 px-4 hover:bg-white/10" disabled={visiblePhotos.length < 2}>Next <ArrowRight size={17} /></button></div></div></div>}
    </div>
  );
}
