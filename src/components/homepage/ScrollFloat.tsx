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
    const update = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const elementCenter = bounds.top + bounds.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const progress = Math.max(-1, Math.min(1, (viewportCenter - elementCenter) / Math.max(window.innerHeight, 1)));
      element.style.transform = `translate3d(0, ${(progress * intensity).toFixed(2)}px, 0)`;
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [intensity]);

  return (
    <div ref={elementRef} className={`${className} will-change-transform`.trim()}>
      {children}
    </div>
  );
}
