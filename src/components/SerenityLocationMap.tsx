"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Building2, MapPin, ShoppingBag, TrainFront, Trees, Utensils } from "lucide-react";

const MAP_IMAGE_SIZE = { width: 1791, height: 878 };

const LOCATION_MAP_MARKERS = [
  {
    className: "location-map-marker--home",
    detail: "7 Tremont St",
    href: "https://www.google.com/maps/search/?api=1&query=7%20Tremont%20St%2C%20Pakenham%20VIC%203810%2C%20Australia",
    icon: MapPin,
    label: "Serenity houses",
    x: 0.55,
    y: 0.51,
  },
  {
    className: "location-map-marker--station",
    detail: "9 min walk",
    href: "https://www.google.com/maps/search/?api=1&query=Railway%20Ave%20%26%20Henry%20Rd%2C%20Pakenham%20VIC%203810%2C%20Australia",
    icon: TrainFront,
    label: "Pakenham Station",
    x: 0.29,
    y: 0.74,
  },
  {
    className: "location-map-marker--marketplace",
    detail: "50–54 John St",
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
    className: "location-map-marker--mummas",
    detail: "food nearby",
    href: "https://maps.app.goo.gl/PPKdUWJEP34zQ9bB8",
    icon: Utensils,
    label: "Mumma Gs Pizza",
    x: 0.66,
    y: 0.43,
  },
] as const;

export function SerenityLocationMap() {
  const mapViewerRef = useRef<HTMLDivElement>(null);

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
          dblClickToZoom: true,
          dragToPan: true,
          scrollToZoom: true,
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

      viewer.addOnceHandler("open", () => {
        if (disposed) return;

        LOCATION_MAP_MARKERS.forEach((marker) => {
          const markerElement = document.createElement("div");
          markerElement.className = "location-map-osd-marker";
          const Icon = marker.icon;
          const root = createRoot(markerElement);
          root.render(
            <a
              className={`location-map-marker ${marker.className}`}
              href={marker.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${marker.label} in Google Maps`}
            >
              <span className="location-map-marker-pin" aria-hidden="true">
                <Icon size={17} strokeWidth={2.1} />
              </span>
              <span className="location-map-marker-copy">
                <strong>{marker.label}</strong>
                <small>{marker.detail}</small>
              </span>
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

        const serenityHouse = LOCATION_MAP_MARKERS.find(
          (marker) => marker.className === "location-map-marker--home",
        );

        if (serenityHouse) {
          const isMobile = window.matchMedia("(max-width: 767px)").matches;
          const housePoint = viewer.viewport.imageToViewportCoordinates(
            serenityHouse.x * MAP_IMAGE_SIZE.width,
            serenityHouse.y * MAP_IMAGE_SIZE.height,
          );

          viewer.viewport.zoomBy(isMobile ? 1.35 : 1.18, viewer.viewport.getCenter(), true);
          viewer.viewport.panTo(housePoint, true);
          viewer.viewport.applyConstraints();
        }
      });
    });

    return () => {
      disposed = true;
      viewerInstance?.destroy();
      queueMicrotask(() => markerRoots.forEach((root) => root.unmount()));
    };
  }, []);

  return (
    <div
      ref={mapViewerRef}
      className="location-editorial-map location-openseadragon-map"
      aria-label="Interactive map of Pakenham. Drag to pan and pinch to zoom."
    />
  );
}
