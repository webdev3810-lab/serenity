"use client";

import { useMemo, useState } from "react";
import Masonry, { type MasonryItem } from "@/src/components/Masonry";

export type GalleryMasonryPhoto = MasonryItem & {
  propertySlug: string;
  propertyName: string;
  categorySlug: string;
  categoryLabel: string;
  propertyOrder: number;
  roomOrder: number;
  photoOrder: number;
};

type GalleryMasonryBrowserProps = {
  items: GalleryMasonryPhoto[];
};

type SortMode = "house" | "room" | "name";

type GalleryCategoryOption = {
  slug: string;
  label: string;
  order: number;
};

export default function GalleryMasonryBrowser({ items }: GalleryMasonryBrowserProps) {
  const [activeRoom, setActiveRoom] = useState("all");
  const [activeHouse, setActiveHouse] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("house");

  const houses = useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach((item) => seen.set(item.propertySlug, item.propertyName));
    return [...seen.entries()];
  }, [items]);

  const roomOptions = useMemo(() => {
    const categories = new Map<string, GalleryCategoryOption>();
    const categoryItems = activeHouse === "all"
      ? items
      : items.filter((item) => item.propertySlug === activeHouse);

    categoryItems.forEach((item) => {
      const current = categories.get(item.categorySlug);
      if (!current || item.roomOrder < current.order) {
        categories.set(item.categorySlug, {
          slug: item.categorySlug,
          label: item.categoryLabel,
          order: item.roomOrder,
        });
      }
    });

    return [
      { slug: "all", label: "All rooms", order: -1 },
      ...[...categories.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
    ];
  }, [activeHouse, items]);

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => activeRoom === "all" || item.categorySlug === activeRoom)
      .filter((item) => activeHouse === "all" || item.propertySlug === activeHouse)
      .sort((a, b) => {
        if (sortMode === "room") {
          return a.roomOrder - b.roomOrder || a.propertyOrder - b.propertyOrder || a.photoOrder - b.photoOrder;
        }
        if (sortMode === "name") {
          return (a.alt ?? "").localeCompare(b.alt ?? "");
        }
        return a.propertyOrder - b.propertyOrder || a.roomOrder - b.roomOrder || a.photoOrder - b.photoOrder;
      });
  }, [activeHouse, activeRoom, items, sortMode]);

  return (
    <div>
      <div className="mb-10 grid gap-6 border-y border-[#D8CCC4] py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-5">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B6B55]">House</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter gallery by house">
              <button
                type="button"
                onClick={() => { setActiveHouse("all"); setActiveRoom("all"); }}
                aria-pressed={activeHouse === "all"}
                className={`rounded-none border px-4 py-2 text-xs font-bold transition-colors ${activeHouse === "all" ? "border-[#5A463A] bg-[#EAE1DD] text-[#2D2622]" : "border-[#D8CCC4] bg-white text-[#5A463A] hover:bg-[#EAE1DD]"}`}
              >
                All houses
              </button>
              {houses.map(([slug, name]) => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => { setActiveHouse(slug); setActiveRoom("all"); }}
                  aria-pressed={activeHouse === slug}
                  className={`rounded-none border px-4 py-2 text-xs font-bold transition-colors ${activeHouse === slug ? "border-[#5A463A] bg-[#EAE1DD] text-[#2D2622]" : "border-[#D8CCC4] bg-white text-[#5A463A] hover:bg-[#EAE1DD]"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B6B55]">
              {activeHouse === "all" ? "Rooms" : `Rooms in ${houses.find(([slug]) => slug === activeHouse)?.[1] ?? "selected house"}`}
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter gallery by room category">
              {roomOptions.map((room) => (
                <button
                  key={room.slug}
                  type="button"
                  onClick={() => setActiveRoom(room.slug)}
                  aria-pressed={activeRoom === room.slug}
                  className={`rounded-none border px-4 py-2 text-xs font-bold transition-colors ${activeRoom === room.slug ? "border-[#2D2622] bg-[#2D2622] text-white" : "border-[#D8CCC4] bg-white text-[#5A463A] hover:bg-[#EAE1DD]"}`}
                >
                  {room.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B6B55] lg:min-w-48">
          Sort photos
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="min-h-10 rounded-none border border-[#D8CCC4] bg-white px-4 text-xs font-bold normal-case tracking-normal text-[#2D2622] outline-none focus:border-[#5A463A]"
          >
            <option value="house">By house</option>
            <option value="room">By room</option>
            <option value="name">By photo name</option>
          </select>
        </label>
      </div>

      <p className="mb-6 text-sm text-[#6F5A4D]" aria-live="polite">
        Showing {visibleItems.length} {visibleItems.length === 1 ? "photo" : "photos"}
        {activeRoom !== "all" ? ` · ${roomOptions.find((room) => room.slug === activeRoom)?.label ?? "Selected room"}` : ""}
        {activeHouse !== "all" ? ` · ${houses.find(([slug]) => slug === activeHouse)?.[1] ?? "Selected house"}` : ""}
      </p>

      {visibleItems.length ? (
        <Masonry
          items={visibleItems}
          animateFrom="bottom"
          ease="power3.out"
          duration={0.65}
          stagger={0.045}
          scaleOnHover
          hoverScale={0.975}
          blurToFocus
          colorShiftOnHover={false}
          className="gallery-simple-masonry"
        />
      ) : (
        <div className="border border-dashed border-[#B99D88] bg-white px-6 py-16 text-center text-sm text-[#6F5A4D]">
          No photos match those filters yet.
        </div>
      )}
    </div>
  );
}
