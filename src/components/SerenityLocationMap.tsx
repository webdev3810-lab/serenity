"use client";

import { useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";

const MAP_IMAGE_SIZE = { width: 1672, height: 941 };
const SERENITY_ADDRESS = "7 Tremont St, Pakenham VIC 3810, Australia";
const mapsSearch = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Pakenham VIC 3810, Australia`)}`;
const mapsDirections = (destination: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(SERENITY_ADDRESS)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;

// Rectangles sit over the pins and printed place labels in /public/MAP.png.
// Coordinates are pixels in the original 1672 × 941 illustration.
const MAP_HOTSPOTS = [
  { label: "Serenity houses", href: mapsSearch("7 Tremont Street"), x: 805, y: 306, width: 276, height: 112 },
  { label: "Serenity 7", href: mapsSearch("7 Tremont Street"), x: 835, y: 416, width: 60, height: 85 },
  { label: "Serenity 9", href: mapsSearch("9 Tremont Street"), x: 914, y: 423, width: 67, height: 84 },
  { label: "Serenity 11", href: mapsSearch("11 Tremont Street"), x: 988, y: 428, width: 67, height: 83 },
  { label: "Pakenham Marketplace", href: mapsSearch("Pakenham Marketplace"), x: 345, y: 248, width: 281, height: 92 },
  { label: "Pakenham Station", href: mapsSearch("Pakenham Station"), x: 474, y: 583, width: 275, height: 77 },
  { label: "Mercure Pakenham Hotel", href: mapsSearch("Mercure Pakenham Hotel"), x: 880, y: 150, width: 289, height: 82 },
  { label: "Pakenham Golf Course", href: mapsSearch("Pakenham Golf Course"), x: 1304, y: 252, width: 295, height: 99 },
  { label: "Bunnings Pakenham", href: mapsSearch("Bunnings Pakenham"), x: 1317, y: 573, width: 284, height: 78 },
  { label: "Hoopla Pakenham", href: mapsSearch("Hoopla Pakenham"), x: 31, y: 486, width: 248, height: 51 },
  { label: "Snap Fitness Pakenham", href: mapsSearch("Snap Fitness Pakenham"), x: 31, y: 538, width: 248, height: 51 },
  { label: "Ascot Park", href: mapsSearch("Ascot Park"), x: 31, y: 590, width: 248, height: 48 },
  { label: "Westpac Pakenham", href: mapsSearch("Westpac Pakenham"), x: 31, y: 639, width: 248, height: 49 },
  { label: "Chemist Warehouse Pakenham", href: mapsSearch("Chemist Warehouse Pakenham"), x: 31, y: 689, width: 248, height: 52 },
  { label: "McDonald's Pakenham", href: mapsSearch("McDonald's Pakenham"), x: 31, y: 742, width: 248, height: 48 },
  { label: "Railway Hotel Pakenham", href: mapsSearch("Railway Hotel Pakenham"), x: 31, y: 792, width: 248, height: 48 },
  { label: "Petrol stations near Tremont Street", href: mapsSearch("petrol station near Tremont Street"), x: 31, y: 842, width: 248, height: 45 },
  { label: "Directions to Melbourne", href: mapsDirections("Melbourne VIC, Australia"), x: 320, y: 816, width: 242, height: 65 },
  { label: "Directions to Phillip Island", href: mapsDirections("Phillip Island VIC, Australia"), x: 1014, y: 865, width: 197, height: 67 },
  { label: "Directions to Gumbuya World", href: mapsDirections("Gumbuya World, Tynong North VIC, Australia"), x: 1261, y: 813, width: 289, height: 71 },
] as const;

export function SerenityLocationMap() {
  const mapViewerRef = useRef<HTMLDivElement>(null);
  const mapControlsRef = useRef<{ zoomBy: (factor: number) => void } | null>(null);

  useEffect(() => {
    const mapElement = mapViewerRef.current;
    if (!mapElement) return;

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
        homeFillsViewer: false,
        maxZoomPixelRatio: 3,
        minZoomImageRatio: 1,
        showNavigationControl: false,
        showNavigator: false,
        tileSources: new OpenSeadragon.ImageTileSource({
          buildPyramid: true,
          url: "/MAP.png",
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

        MAP_HOTSPOTS.forEach((hotspot) => {
          const link = document.createElement("a");
          link.className = "location-map-image-hotspot";
          link.href = hotspot.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.setAttribute("aria-label", `Open ${hotspot.label} in Google Maps`);
          link.addEventListener("pointerdown", (event) => event.stopPropagation());
          link.addEventListener("click", (event) => event.stopPropagation());

          viewer.addOverlay(
            link,
            viewer.viewport.imageToViewportRectangle(hotspot.x, hotspot.y, hotspot.width, hotspot.height),
          );
        });

        if (window.matchMedia("(max-width: 767px)").matches) {
          viewer.viewport.zoomBy(1.7, viewer.viewport.getCenter(), true);
          viewer.viewport.panTo(
            viewer.viewport.imageToViewportCoordinates(MAP_IMAGE_SIZE.width * 0.55, MAP_IMAGE_SIZE.height * 0.47),
            true,
          );
          viewer.viewport.applyConstraints();
        }
      });
    });

    return () => {
      disposed = true;
      mapControlsRef.current = null;
      viewerInstance?.destroy();
    };
  }, []);

  return (
    <div className="location-editorial-map location-openseadragon-shell location-illustrated-map">
      <div
        ref={mapViewerRef}
        className="location-openseadragon-map"
        aria-label="Illustrated map of Pakenham. Select a place to open it in Google Maps, drag to pan, or use the zoom controls."
      />
      <span className="location-map-mobile-hint" aria-hidden="true">Drag to explore · Tap a pin for Google Maps</span>
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
