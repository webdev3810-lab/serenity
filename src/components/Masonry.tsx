"use client";

import Image from "next/image";
import { gsap } from "gsap";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const MEDIA_QUERIES = [
  "(min-width: 1500px)",
  "(min-width: 1000px)",
  "(min-width: 600px)",
  "(min-width: 400px)",
];
const MEDIA_COLUMNS = [5, 4, 3, 2];

export type MasonryItem = {
  id: string;
  img: string;
  url: string;
  height: number;
  alt?: string;
  category?: string;
};

type GridItem = MasonryItem & {
  x: number;
  y: number;
  w: number;
  h: number;
};

type MasonryProps = {
  items: MasonryItem[];
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: "bottom" | "top" | "left" | "right" | "center" | "random";
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
  colorShiftOnHover?: boolean;
  disableAnimations?: boolean;
  className?: string;
};

function useMedia(queries: string[], values: number[], defaultValue: number) {
  const getValue = useCallback(() => {
    if (typeof window === "undefined") return defaultValue;
    const queryIndex = queries.findIndex((query) => window.matchMedia(query).matches);
    return values[queryIndex] ?? defaultValue;
  }, [defaultValue, queries, values]);

  const [value, setValue] = useState(getValue);

  useEffect(() => {
    const update = () => setValue(getValue());
    const mediaQueries = queries.map((query) => window.matchMedia(query));
    mediaQueries.forEach((mediaQuery) => mediaQuery.addEventListener("change", update));
    return () => mediaQueries.forEach((mediaQuery) => mediaQuery.removeEventListener("change", update));
  }, [getValue, queries]);

  return value;
}

function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

const isPreviewImage = (src: string) => src.includes("a0.muscache.com");

function getStartPosition(item: GridItem, container: HTMLDivElement | null, animateFrom: MasonryProps["animateFrom"]) {
  const bounds = container?.getBoundingClientRect();
  const direction = animateFrom === "random"
    ? (["top", "bottom", "left", "right"] as const)[Math.floor(Math.random() * 4)]
    : animateFrom;

  switch (direction) {
    case "top":
      return { x: item.x, y: -Math.max(180, item.h) };
    case "left":
      return { x: -Math.max(180, item.w), y: item.y };
    case "right":
      return { x: window.innerWidth + Math.max(180, item.w), y: item.y };
    case "center":
      return {
        x: (bounds?.width ?? item.w) / 2 - item.w / 2,
        y: (bounds?.height ?? item.h) / 2 - item.h / 2,
      };
    case "bottom":
    default:
      return { x: item.x, y: window.innerHeight + Math.max(180, item.h) };
  }
}

export default function Masonry({
  items,
  ease = "power3.out",
  duration = 0.6,
  stagger = 0.045,
  animateFrom = "bottom",
  scaleOnHover = true,
  hoverScale = 0.975,
  blurToFocus = true,
  colorShiftOnHover = false,
  disableAnimations = false,
  className = "",
}: MasonryProps) {
  const columns = useMedia(MEDIA_QUERIES, MEDIA_COLUMNS, 1);
  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const hasMounted = useRef(false);

  const grid = useMemo<GridItem[]>(() => {
    if (!width || !items.length) return [];

    const gap = width < 600 ? 12 : 16;
    const columnHeights = new Array(columns).fill(0) as number[];
    const columnWidth = (width - (columns - 1) * gap) / columns;

    return items.map((item) => {
      const column = columnHeights.indexOf(Math.min(...columnHeights));
      const height = Math.max(180, item.height / 2);
      const gridItem: GridItem = {
        ...item,
        x: column * (columnWidth + gap),
        y: columnHeights[column],
        w: columnWidth,
        h: height,
      };
      columnHeights[column] += height + gap;
      return gridItem;
    });
  }, [columns, items, width]);

  const gridHeight = grid.length ? Math.max(...grid.map((item) => item.y + item.h)) : 0;

  useLayoutEffect(() => {
    if (!grid.length) return;

    const entries = grid
      .map((item) => ({ item, element: itemRefs.current.get(item.id) }))
      .filter((entry): entry is { item: GridItem; element: HTMLDivElement } => Boolean(entry.element));
    if (!entries.length) return;

    entries.forEach(({ item, element }, index) => {
      const layout = { x: item.x, y: item.y, width: item.w, height: item.h };
      if (disableAnimations || hasMounted.current) {
        gsap.to(element, { ...layout, opacity: 1, filter: "blur(0px)", duration: disableAnimations ? 0 : duration, ease, overwrite: "auto" });
        return;
      }

      const start = getStartPosition(item, containerRef.current, animateFrom);
      gsap.fromTo(
        element,
        {
          opacity: 0,
          x: start.x,
          y: start.y,
          width: item.w,
          height: item.h,
          ...(blurToFocus ? { filter: "blur(12px)" } : {}),
        },
        {
          ...layout,
          opacity: 1,
          ...(blurToFocus ? { filter: "blur(0px)" } : {}),
          duration: 0.75,
          ease: "power3.out",
          delay: index * stagger,
          overwrite: "auto",
        },
      );
    });

    hasMounted.current = true;
    return () => gsap.killTweensOf(entries.map(({ element }) => element));
  }, [animateFrom, blurToFocus, containerRef, disableAnimations, duration, ease, grid, stagger]);

  const handleHover = (id: string, element: HTMLDivElement, active: boolean) => {
    const target = itemRefs.current.get(id) ?? element;
    if (scaleOnHover) {
      gsap.to(target, { scale: active ? hoverScale : 1, duration: 0.28, ease: "power2.out", overwrite: "auto" });
    }
    if (colorShiftOnHover) {
      const overlay = element.querySelector<HTMLElement>(".serenity-masonry-overlay");
      if (overlay) gsap.to(overlay, { opacity: active ? 0.22 : 0, duration: 0.28, overwrite: "auto" });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`serenity-masonry ${className}`.trim()}
      style={{ height: gridHeight || undefined }}
      role="region"
      aria-label="House photo gallery"
    >
      {grid.map((item, index) => {
        const previewImage = isPreviewImage(item.img);
        return (
          <div
            key={item.id}
            ref={(element) => {
              if (element) itemRefs.current.set(item.id, element);
              else itemRefs.current.delete(item.id);
            }}
            data-key={item.id}
            className="serenity-masonry-item"
            style={{ width: item.w, height: item.h, opacity: disableAnimations ? 1 : undefined }}
          >
            <a
              href={item.url}
              className="serenity-masonry-card"
              onMouseEnter={(event) => handleHover(item.id, event.currentTarget.parentElement as HTMLDivElement, true)}
              onMouseLeave={(event) => handleHover(item.id, event.currentTarget.parentElement as HTMLDivElement, false)}
              onFocus={(event) => handleHover(item.id, event.currentTarget.parentElement as HTMLDivElement, true)}
              onBlur={(event) => handleHover(item.id, event.currentTarget.parentElement as HTMLDivElement, false)}
              aria-label={`${item.category ? `${item.category}: ` : ""}${item.alt ?? "View house photo"}`}
            >
              <Image
                src={item.img}
                alt={item.alt ?? "House photo"}
                fill
                loading={index < columns ? "eager" : "lazy"}
                unoptimized={previewImage}
                referrerPolicy={previewImage ? "no-referrer" : undefined}
                sizes="(max-width: 399px) 100vw, (max-width: 599px) 50vw, (max-width: 999px) 33vw, (max-width: 1499px) 25vw, 20vw"
                className="serenity-masonry-image"
              />
              <span className="serenity-masonry-shade" aria-hidden="true" />
              <span className="serenity-masonry-overlay" aria-hidden="true" />
              <span className="serenity-masonry-caption">
                <span>{item.category ?? "House photo"}</span>
                <small>{item.alt ?? "View house photo"}</small>
              </span>
            </a>
          </div>
        );
      })}
    </div>
  );
}
