import type { ReactNode } from "react";

interface EyebrowLabelProps {
  children: ReactNode;
  className?: string;
}

/**
 * Small all-caps ochre label rendered above section headings.
 * Matches the existing `.eyebrow` CSS class with accent-ochre colouring.
 */
export default function EyebrowLabel({ children, className = "" }: EyebrowLabelProps) {
  return (
    <p className={`eyebrow text-xs font-bold uppercase tracking-[0.16em] text-[#B98A43] mb-3 ${className}`}>
      {children}
    </p>
  );
}
