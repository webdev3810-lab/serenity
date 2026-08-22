"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export interface ScrollWipeTextProps {
  as?: "h1" | "h2" | "h3" | "p";
  children: ReactNode;
  className?: string;
  revealClassName?: string;
  tone?: "dark" | "light";
  "aria-label"?: string;
  style?: CSSProperties;
}

/**
 * Reveals a second, darker text layer from left to right once the heading
 * enters the viewport. The muted layer remains visible underneath, so the
 * effect also works when JavaScript is unavailable.
 */
export default function ScrollWipeText({
  as = "h2",
  children,
  className = "",
  revealClassName = "",
  tone = "dark",
  "aria-label": ariaLabel,
  style,
}: ScrollWipeTextProps) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.dataset.revealed = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        root.dataset.revealed = "true";
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const Tag = as;

  return (
    <Tag
      ref={(node) => {
        rootRef.current = node;
      }}
      className={`scroll-wipe-text scroll-wipe-text-${tone} ${className}`.trim()}
      aria-label={ariaLabel}
      style={style}
    >
      <span className="scroll-wipe-text-base" aria-hidden="true">
        {children}
      </span>
      <span className={`scroll-wipe-text-reveal ${revealClassName}`.trim()}>
        {children}
      </span>
    </Tag>
  );
}
