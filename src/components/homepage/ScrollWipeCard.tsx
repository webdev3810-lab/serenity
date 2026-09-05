"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface ScrollWipeCardProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}

/** Reveals a house card from its bottom edge once it enters the viewport. */
export default function ScrollWipeCard({
  children,
  className = "",
  delayMs = 0,
}: ScrollWipeCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [wipeState, setWipeState] = useState<"idle" | "pending" | "revealed">("idle");

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWipeState("revealed");
      return;
    }

    setWipeState("pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setWipeState("revealed");
        observer.disconnect();
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <article
      ref={cardRef}
      className={`homepage-house-collection-card homepage-house-collection-card-wipe ${className}`.trim()}
      data-wipe-state={wipeState}
      style={{ "--house-card-wipe-delay": `${delayMs}ms` } as CSSProperties}
    >
      {children}
    </article>
  );
}
