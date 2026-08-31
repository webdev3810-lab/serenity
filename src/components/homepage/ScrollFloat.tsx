"use client";

import { useEffect, useRef } from "react";

interface ScrollFloatProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

/** Adds a subtle scroll-linked lift to editorial media without affecting layout. */
export default function ScrollFloat({ children, className = "", intensity = 28 }: ScrollFloatProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    let frame = 0;
    let targetY = 0;
    let currentY = 0;

    const tick = () => {
      currentY += (targetY - currentY) * 0.06; // smooth water-like inertia
      
      if (Math.abs(targetY - currentY) > 0.05) {
        element.style.transform = `translate3d(0, ${currentY.toFixed(2)}px, 0)`;
        frame = window.requestAnimationFrame(tick);
      } else {
        currentY = targetY;
        element.style.transform = `translate3d(0, ${currentY.toFixed(2)}px, 0)`;
        frame = 0;
      }
    };

    const update = () => {
      const bounds = element.getBoundingClientRect();
      // Subtract currentY to get the element's natural, untransformed position
      const naturalTop = bounds.top - currentY;
      const elementCenter = naturalTop + bounds.height / 2;
      const viewportCenter = window.innerHeight / 2;
      
      const isMobile = window.innerWidth < 768;
      const effectiveIntensity = isMobile ? intensity * 0.4 : intensity;
      const progress = Math.max(-1, Math.min(1, (viewportCenter - elementCenter) / Math.max(window.innerHeight, 1)));
      
      targetY = progress * effectiveIntensity;
      
      if (!frame) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [intensity]);

  return (
    <div ref={elementRef} className={`${className} will-change-transform`.trim()}>
      {children}
    </div>
  );
}
