"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  Building2,
  Dumbbell,
  Fuel,
  Hotel,
  Landmark,
  MapPin,
  Minus,
  Navigation,
  Pill,
  Plus,
  ShoppingBag,
  ShoppingCart,
  TrainFront,
  Trees,
  Utensils,
} from "lucide-react";

const MAP_IMAGE_SIZE = { width: 1791, height: 878 };
const SERENITY_ADDRESS = "7 Tremont St, Pakenham VIC 3810, Australia";
const mapsSearch = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Pakenham VIC 3810, Australia`)}`;
const mapsDirections = (destination: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(SERENITY_ADDRESS)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;

const LOCATION_MAP_MARKERS = [
  {
    className: "location-map-marker--home-number",
    detail: "7 Tremont St",
    href: mapsSearch("7 Tremont St"),
    icon: MapPin,
    label: "Serenity 7",
    number: 7,
    x: 0.54,
    y: 0.51,
  },
  {
    className: "location-map-marker--home-number",
    detail: "9 Tremont St",
    href: mapsSearch("9 Tremont St"),
    icon: MapPin,
    label: "Serenity 9",
    number: 9,
    x: 0.565,
    y: 0.51,
  },
  {
    className: "location-map-marker--home-number",
    detail: "11 Tremont St",
    href: mapsSearch("11 Tremont St"),
    icon: MapPin,
    label: "Serenity 11",
    number: 11,
    x: 0.59,
    y: 0.51,
  },
  {
    className: "location-map-marker--station",
    detail: "Approx. 9 min walk",
    href: "https://www.google.com/maps/search/?api=1&query=Railway%20Ave%20%26%20Henry%20Rd%2C%20Pakenham%20VIC%203810%2C%20Australia",
    icon: TrainFront,
    label: "Pakenham Station",
    x: 0.29,
    y: 0.74,
  },
  {
    className: "location-map-marker--marketplace",
    detail: "Woolworths · BIG W · banks",
    href: "https://maps.app.goo.gl/kemcZccCbPz44BKH6",
    icon: ShoppingBag,
    label: "Pakenham Marketplace",
    x: 0.18,
    y: 0.51,
  },
  {
    className: "location-map-marker--park",
    detail: "green space",
    href: "https://maps.app.goo.gl/hkb8K1WL4RtGurnXA",
    icon: Trees,
    label: "Ascot Park",
    x: 0.43,
    y: 0.46,
  },
  {
    className: "location-map-marker--bigw",
    detail: "everyday shopping",
    href: "https://maps.app.goo.gl/nNaFDCV9SWn9fGhdA",
    icon: Building2,
    label: "BIG W Pakenham",
    x: 0.19,
    y: 0.43,
  },
  {
    className: "location-map-marker--hoopla",
    detail: "10 Meadow Parade · gym & fitness",
    href: "https://maps.app.goo.gl/Q2D41ydceBNe63UE9",
    icon: Building2,
    label: "Hoopla Pakenham",
    x: 0.36,
    y: 0.32,
  },
  {
    className: "location-map-marker--compact location-map-marker--direction",
    detail: "Approx. 25 min drive",
    href: mapsDirections("Gumbuya World, Tynong North VIC, Australia"),
    icon: Navigation,
    label: "Gumbuya World",
    x: 0.08,
    y: 0.17,
  },
  {
    className: "location-map-marker--compact location-map-marker--fitness",
    detail: "24/7 gym & fitness",
    href: mapsSearch("Snap Fitness Pakenham"),
    icon: Dumbbell,
    label: "Snap Fitness Pakenham",
    x: 0.49,
    y: 0.2,
  },
  {
    className: "location-map-marker--compact location-map-marker--direction",
    detail: "Via Monash Freeway · approx. 50 min",
    href: mapsDirections("Melbourne VIC, Australia"),
    icon: Navigation,
    label: "Melbourne CBD",
    x: 0.84,
    y: 0.16,
  },
  {
    className: "location-map-marker--compact location-map-marker--nature",
    detail: "Approx. 8 min drive",
    href: mapsSearch("Pakenham Golf Course"),
    icon: Trees,
    label: "Pakenham Golf Course",
    x: 0.91,
    y: 0.31,
  },
  {
    className: "location-map-marker--compact location-map-marker--shopping",
    detail: "Pakenham Marketplace",
    href: mapsSearch("Woolworths Pakenham Marketplace"),
    icon: ShoppingCart,
    label: "Woolworths",
    x: 0.16,
    y: 0.6,
  },
  {
    className: "location-map-marker--compact location-map-marker--services",
    detail: "BP / Liberty nearby",
    href: mapsSearch("petrol station near Tremont Street"),
    icon: Fuel,
    label: "24/7 petrol station",
    x: 0.83,
    y: 0.68,
  },
  {
    className: "location-map-marker--compact location-map-marker--shopping",
    detail: "Approx. 5 min drive",
    href: mapsSearch("Bunnings Pakenham"),
    icon: ShoppingBag,
    label: "Bunnings Pakenham",
    x: 0.84,
    y: 0.82,
  },
  {
    className: "location-map-marker--compact location-map-marker--services",
    detail: "On Main Street",
    href: mapsSearch("Westpac Branch Pakenham"),
    icon: Landmark,
    label: "Westpac Pakenham",
    x: 0.1,
    y: 0.82,
  },
  {
    className: "location-map-marker--compact location-map-marker--services",
    detail: "Main Street",
    href: mapsSearch("Chemist Warehouse Pakenham"),
    icon: Pill,
    label: "Chemist Warehouse",
    x: 0.18,
    y: 0.92,
  },
  {
    className: "location-map-marker--compact location-map-marker--dining",
    detail: "On Main Street",
    href: mapsSearch("McDonald's Pakenham"),
    icon: Utensils,
    label: "McDonald's Pakenham",
    x: 0.3,
    y: 0.94,
  },
  {
    className: "location-map-marker--compact location-map-marker--dining",
    detail: "Food & drinks",
    href: mapsSearch("Railway Hotel Pakenham"),
    icon: Utensils,
    label: "Railway Hotel",
    x: 0.41,
    y: 0.87,
  },
  {
    className: "location-map-marker--compact location-map-marker--stay",
    detail: "Approx. 3 min drive",
    href: mapsSearch("Mercure Pakenham Hotel"),
    icon: Hotel,
    label: "Mercure Pakenham",
    x: 0.57,
    y: 0.94,
  },
  {
    className: "location-map-marker--compact location-map-marker--direction",
    detail: "Approx. 45 min drive",
    href: mapsDirections("Phillip Island VIC, Australia"),
    icon: Navigation,
    label: "Phillip Island",
    x: 0.84,
    y: 0.94,
  },
] as const;

export function SerenityLocationMap() {
  const mapViewerRef = useRef<HTMLDivElement>(null);
  const mapControlsRef = useRef<{ zoomBy: (factor: number) => void } | null>(null);

  useEffect(() => {
    const mapElement = mapViewerRef.current;
    if (!mapElement) return;

    const markerRoots: Root[] = [];
    let disposed = false;
    let viewerInstance: { destroy: () => void } | undefined;

    void import("openseadragon").then(({ default: OpenSeadragon }) => {
      if (disposed) return;

      const viewer = OpenSeadragon({
        element: mapElement,
        animationTime: 0.35,
        constrainDuringPan: true,
        gestureSettingsMouse: {
          clickToZoom: false,
          dblClickToZoom: false,
          dragToPan: true,
          scrollToZoom: false,
        },
        gestureSettingsTouch: {
          clickToZoom: false,
          dragToPan: true,
          flickEnabled: true,
          pinchToZoom: true,
        },
        homeFillsViewer: true,
        maxZoomPixelRatio: 3,
        minZoomImageRatio: 1,
        showNavigationControl: false,
        showNavigator: false,
        tileSources: new OpenSeadragon.ImageTileSource({
          buildPyramid: true,
          url: "/mymap.png",
        }) as unknown as { getTileUrl: (level: number, x: number, y: number) => string },
        visibilityRatio: 1,
      });
      viewerInstance = viewer;
      viewer.addHandler("canvas-scroll", (event) => {
        event.preventDefaultAction = true;
        event.preventDefault = false;
      });
      mapControlsRef.current = {
        zoomBy: (factor) => {
          viewer.viewport.zoomBy(factor);
          viewer.viewport.applyConstraints();
        },
      };

      viewer.addOnceHandler("open", () => {
        if (disposed) return;

        LOCATION_MAP_MARKERS.forEach((marker) => {
          const markerElement = document.createElement("div");
          markerElement.className = "location-map-osd-marker";
          const Icon = marker.icon;
          const alignRight = marker.x >= 0.75;
          const positionAbove = marker.y >= 0.8;
          const root = createRoot(markerElement);
          root.render(
            <a
              className={`location-map-marker ${marker.className}${alignRight ? " location-map-marker--align-right" : ""}${positionAbove ? " location-map-marker--above" : ""}`}
              href={marker.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${marker.label} in Google Maps`}
              title={`${marker.label} — ${marker.detail}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <span className="location-map-marker-pin" aria-hidden="true">
                {"number" in marker ? marker.number : <Icon size={17} strokeWidth={2.1} />}
              </span>
              {!("number" in marker) && (
                <span className="location-map-marker-copy">
                  <strong>{marker.label}</strong>
                  <small>{marker.detail}</small>
                </span>
              )}
            </a>,
          );
          markerRoots.push(root);

          viewer.addOverlay(
            markerElement,
            viewer.viewport.imageToViewportCoordinates(
              marker.x * MAP_IMAGE_SIZE.width,
              marker.y * MAP_IMAGE_SIZE.height,
            ),
            OpenSeadragon.Placement.TOP_LEFT,
          );
        });

        const serenityHomes = LOCATION_MAP_MARKERS.filter(
          (marker) => marker.className === "location-map-marker--home-number",
        );

        if (serenityHomes.length && window.matchMedia("(max-width: 767px)").matches) {
          const homeCenter = serenityHomes.reduce(
            (center, marker) => ({ x: center.x + marker.x / serenityHomes.length, y: center.y + marker.y / serenityHomes.length }),
            { x: 0, y: 0 },
          );
          const housePoint = viewer.viewport.imageToViewportCoordinates(
            homeCenter.x * MAP_IMAGE_SIZE.width,
            homeCenter.y * MAP_IMAGE_SIZE.height,
          );

          viewer.viewport.zoomBy(2.15, viewer.viewport.getCenter(), true);
          viewer.viewport.panTo(housePoint, true);
          viewer.viewport.applyConstraints();
        }
      });
    });

    return () => {
      disposed = true;
      mapControlsRef.current = null;
      viewerInstance?.destroy();
      queueMicrotask(() => markerRoots.forEach((root) => root.unmount()));
    };
  }, []);

  return (
    <div className="location-editorial-map location-openseadragon-shell">
      <div
        ref={mapViewerRef}
        className="location-openseadragon-map"
        aria-label="Interactive map of Pakenham. Drag to pan, pinch on a touch screen, or use the zoom controls."
      />
      <span className="location-map-mobile-hint" aria-hidden="true">Drag to explore nearby places</span>
      <div className="location-map-zoom-controls" role="group" aria-label="Map zoom controls">
        <button type="button" onClick={() => mapControlsRef.current?.zoomBy(1.4)} aria-label="Zoom in" title="Zoom in">
          <Plus size={19} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => mapControlsRef.current?.zoomBy(1 / 1.4)} aria-label="Zoom out" title="Zoom out">
          <Minus size={19} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
