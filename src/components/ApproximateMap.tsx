"use client";

import { MapPin, Navigation, Search, ShieldCheck, ZoomIn, ZoomOut } from "lucide-react";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatAud } from "@/src/lib/booking";

type MapProperty = {
  slug: string;
  name: string;
  nightlyPrice: number;
};

type ApproximateMapProps = {
  compact?: boolean;
  borderless?: boolean;
  areaOnly?: boolean;
  title?: string;
  properties?: MapProperty[];
  selectedSlug?: string;
  onSelectProperty?: (slug: string) => void;
  fullHeight?: boolean;
  hideHeader?: boolean;
};

type Point = {
  x: number;
  y: number;
};

type LatLng = {
  lat: number;
  lng: number;
};

// Keep every public marker tied to one broad neighbourhood anchor. Individual
// listing coordinates are deliberately not used by this component.
const approximateAreaLocation: LatLng = { lat: -38.077, lng: 145.483 };
const tileSize = 256;
const minZoom = 11;
const maxZoom = 18;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const latLngToWorld = ({ lat, lng }: LatLng, zoom: number): Point => {
  const scale = tileSize * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
};

const worldToLatLng = ({ x, y }: Point, zoom: number): LatLng => {
  const scale = tileSize * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return {
    lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng,
  };
};

export function ApproximateMap({ compact = false, borderless = false, areaOnly = false, title = "Where you'll be", properties, selectedSlug, onSelectProperty, fullHeight = false, hideHeader = false }: ApproximateMapProps) {
  const [center, setCenter] = useState<LatLng>(approximateAreaLocation);
  const [zoom, setZoom] = useState(13);
  const [viewport, setViewport] = useState({ width: 900, height: compact ? 288 : 480 });
  const [drag, setDrag] = useState<{ pointerId: number; start: Point; center: Point } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;

    const updateSize = () => {
      const { width, height } = el.getBoundingClientRect();
      setViewport({ width, height });
    };

    const handleWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (Math.abs(event.deltaY) < 6) return;
      setZoom((value) => clamp(value + (event.deltaY > 0 ? -1 : 1), minZoom, maxZoom));
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    updateSize();

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const centerWorld = latLngToWorld(center, zoom);
  const areaWorld = latLngToWorld(approximateAreaLocation, zoom);
  const markerPosition = {
    left: viewport.width / 2 + areaWorld.x - centerWorld.x,
    top: viewport.height / 2 + areaWorld.y - centerWorld.y,
  };
  const propertyMarkers = (properties ?? []).map((property, index, allProperties) => {
    // Keep the price pins readable while ensuring the map communicates an area,
    // not a different exact address for every house.
    const markerOffsets = [
      { x: -42, y: 24 },
      { x: 0, y: -24 },
      { x: 42, y: 28 },
    ];
    const defaultOffset = { x: (index - (allProperties.length - 1) / 2) * 34, y: 22 };
    const offset = markerOffsets[index] ?? defaultOffset;
    const controlClearance = properties?.length ? Math.min(64, viewport.height * 0.28) : 0;
    return {
      property,
      left: viewport.width / 2 + areaWorld.x - centerWorld.x + offset.x,
      top: viewport.height / 2 + areaWorld.y - centerWorld.y + offset.y + controlClearance,
    };
  });
  const tiles = useMemo(() => {
    const startX = Math.floor((centerWorld.x - viewport.width / 2) / tileSize);
    const endX = Math.floor((centerWorld.x + viewport.width / 2) / tileSize);
    const startY = Math.floor((centerWorld.y - viewport.height / 2) / tileSize);
    const endY = Math.floor((centerWorld.y + viewport.height / 2) / tileSize);
    const maxTile = 2 ** zoom;
    const result = [];

    for (let x = startX - 1; x <= endX + 1; x += 1) {
      for (let y = startY - 1; y <= endY + 1; y += 1) {
        if (y < 0 || y >= maxTile) continue;
        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        const tileUrl = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`;
        result.push({
          key: `map-${zoom}-${x}-${y}`,
          src: tileUrl,
          left: x * tileSize - centerWorld.x + viewport.width / 2,
          top: y * tileSize - centerWorld.y + viewport.height / 2,
        });
      }
    }

    return result;
  }, [centerWorld.x, centerWorld.y, viewport.height, viewport.width, zoom]);

  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      center: centerWorld,
    });
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    setCenter(worldToLatLng({
      x: drag.center.x - (event.clientX - drag.start.x),
      y: drag.center.y - (event.clientY - drag.start.y),
    }, zoom));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag?.pointerId === event.pointerId) setDrag(null);
  };

  const changeZoom = (delta: number) => setZoom((value) => clamp(value + delta, minZoom, maxZoom));

  const resetCenter = () => {
    setCenter(approximateAreaLocation);
    setZoom(14);
  };

  const areaPinAction = areaOnly && properties?.[0] && onSelectProperty
    ? () => onSelectProperty(properties[0].slug)
    : undefined;

  return (
    <div className={`approximate-map-shell ${borderless ? "approximate-map-borderless" : "rounded-none border border-stone-200 bg-white p-4 shadow-sm sm:p-6"} ${fullHeight ? "approximate-map-full-height flex h-full min-h-0 flex-col" : ""}`}>
      {!hideHeader ? <div className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="eyebrow flex items-center gap-1.5 text-xs text-[#7A4E2D]">
            <MapPin size={14} /> Pakenham VIC 3810 · Victoria
          </span>
          <h2 className="text-2xl font-bold text-stone-900 mt-1">{title}</h2>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-none border border-[#EADCCF] bg-[#FAF5EF] px-3 py-1 text-xs font-semibold text-[#7A4E2D]">
          <ShieldCheck size={14} /> {properties?.length ? `${properties.length} houses available` : "Exact address sent after booking"}
        </div>
      </div> : null}

      <div
        ref={mapRef}
        className={`relative min-h-0 touch-none overflow-hidden ${borderless ? "" : "rounded-none border border-stone-300"} bg-[#e5e3df] ${compact ? "h-72" : fullHeight ? "flex-1" : "h-[440px]"}`}
        style={{ touchAction: "none", overscrollBehavior: "contain" }}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="application"
        aria-label="Google Maps style interactive map of Pakenham, Victoria, Australia"
      >
        <div className="absolute left-0 top-0 h-full w-full cursor-grab active:cursor-grabbing">
          {tiles.map((tile) => (
            <div
              key={tile.key}
              className="absolute h-64 w-64 select-none bg-cover transition-opacity duration-300"
              style={{ left: tile.left, top: tile.top, backgroundImage: `url(${tile.src})` }}
            />
          ))}
        </div>

        {/* Top Google Maps Search & Header */}
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-none bg-white/95 backdrop-blur-md px-3 py-2 shadow-md border border-stone-200 max-w-[calc(100%-6rem)]">
          <Search size={16} className="text-stone-600 shrink-0" />
          <span className="text-xs font-bold text-stone-800 truncate">Pakenham, VIC 3810, Australia</span>
        </div>

        {/* Zoom & Recenter Controls */}
        <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={resetCenter}
            className="flex h-9 w-9 items-center justify-center rounded-none bg-white text-stone-700 shadow-md border border-stone-200 hover:bg-stone-50 hover:text-stone-900 transition-colors"
            aria-label="Re-center map on Serenity House area"
            title="Re-center map"
          >
            <Navigation size={16} />
          </button>

          <div className="flex flex-col rounded-none overflow-hidden bg-white text-stone-700 shadow-md border border-stone-200">
            <button
              type="button"
              onClick={() => changeZoom(1)}
              className="flex h-9 w-9 items-center justify-center border-b border-stone-200 hover:bg-stone-50 hover:text-stone-900 transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={() => changeZoom(-1)}
              className="flex h-9 w-9 items-center justify-center hover:bg-stone-50 hover:text-stone-900 transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
          </div>
        </div>

        {/* Available property pins */}
        {!areaOnly && propertyMarkers.length ? propertyMarkers.map(({ property, left, top }) => {
          const selected = property.slug === selectedSlug;
          return (
            <a
              key={property.slug}
              href={`#property-${property.slug}`}
              className="absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center"
              style={{ left, top }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                if (!onSelectProperty) return;
                event.preventDefault();
                event.stopPropagation();
                onSelectProperty(property.slug);
              }}
              aria-label={`View ${property.name} on the property list`}
            >
              <span className={`mb-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold shadow-lg transition-colors ${selected ? "border-[#5A463A] bg-[#2D2622] text-white" : "border-white bg-white text-[#2D2622]"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-[#D8CCC4]" : "bg-[#7A4E2D]"}`} aria-hidden="true" />
                {formatAud(property.nightlyPrice)}
              </span>
              <span className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-white shadow-[0_4px_14px_rgba(45,38,34,0.35)] transition-transform ${selected ? "scale-125 bg-[#2D2622]" : "bg-[#7A4E2D]"}`}>
                <MapPin size={21} strokeWidth={2.4} fill="currentColor" />
              </span>
            </a>
          );
        }) : (
          <div
            className={`${areaPinAction ? "cursor-pointer" : "pointer-events-none"} absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center`}
            style={{ left: markerPosition.left, top: markerPosition.top }}
            role={areaPinAction ? "button" : undefined}
            tabIndex={areaPinAction ? 0 : undefined}
            onClick={areaPinAction}
            onKeyDown={(event) => {
              if (areaPinAction && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                areaPinAction();
              }
            }}
            aria-label={areaPinAction ? "View availability near the Serenity Houses Area" : undefined}
          >
            <div className="mb-2 flex items-center gap-1.5 rounded-full border border-white bg-white px-3 py-1.5 text-[11px] font-bold text-[#2D2622] shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7A4E2D]" aria-hidden="true" />
              <span>Serenity Houses Area</span>
            </div>
            <div className="flex h-12 w-12 place-items-center justify-center rounded-full border-2 border-white bg-[#2D2622] text-white shadow-[0_4px_14px_rgba(45,38,34,0.4)]">
              <MapPin size={22} strokeWidth={2.4} fill="currentColor" />
            </div>
          </div>
        )}

        {/* Footer Attribution */}
        <div className="absolute bottom-1 right-1 z-10 rounded-none bg-white/80 px-1.5 py-0.5 text-[9px] text-stone-600">
          © OpenStreetMap contributors · Approximate area · Pakenham VIC
        </div>
      </div>

      <p className="mt-4 shrink-0 text-xs leading-relaxed text-stone-600">
        Serenity 7, Serenity 9, and Serenity 11 are conveniently located beside each other in Pakenham Victoria. For security and guest privacy, the approximate neighbourhood area is shown above. Key safe codes and exact street details are dispatched automatically upon booking confirmation.
      </p>
    </div>
  );
}
