import Link from "next/link";
import { GsapFadeIn } from "./AnimatedSection";
import type { Property } from "@/src/data/properties";
import Grainient from "@/src/components/ui/Grainient";
import ScrollWipeText from "./ScrollWipeText";

export interface HomepageCorporateSectionProps {
  eyebrow?: string;
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  properties: Property[];
  displayName: (name: string) => string;
  className?: string;
}

/**
 * Corporate section: cinematic mesh gradient background with elegant top-left typography.
 */
export default function HomepageCorporateSection({
  eyebrow = "Corporate & Group Stays",
  heading,
  description,
  ctaLabel,
  ctaHref,
  className = "",
}: HomepageCorporateSectionProps) {
  return (
    <section 
      className={`relative flex min-h-[100svh] items-center overflow-hidden py-32 ${className}`}
    >
      {/* Grainient background keeps the corporate section atmospheric without using a stock image. */}
      <div className="absolute inset-0 z-0 bg-[#2D2521]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-95" aria-hidden="true">
        <Grainient
          color1="#D9C4B5"
          color2="#8E6E5B"
          color3="#2D2521"
          timeSpeed={0.12}
          colorBalance={0.08}
          warpStrength={1.25}
          warpFrequency={3.5}
          warpSpeed={1.5}
          blendSoftness={0.16}
          grainAmount={0.045}
          contrast={1.15}
          saturation={0.82}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[#211914]/35" aria-hidden="true" />

      <GsapFadeIn className="relative z-10 w-full max-w-[1920px] mx-auto px-8 sm:px-16 lg:px-24 xl:pl-32 flex flex-col items-start justify-center">
        <div className="max-w-3xl">
          {eyebrow && (
            <span className="text-[10px] sm:text-[11px] font-sans font-bold tracking-widest uppercase text-[#D2C0B4] mb-6 block">
              {eyebrow}
            </span>
          )}
          <ScrollWipeText tone="light" className="homepage-corporate-heading display-font text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-[56px] mb-8">
            {heading}
          </ScrollWipeText>
          <p className="text-[13px] sm:text-[15px] text-white/80 leading-[1.8] max-w-lg mb-12 font-sans font-medium">
            {description}
          </p>
          
          <div>
            <Link 
              href={ctaHref} 
              className="inline-block bg-white text-stone-900 rounded-none px-8 py-3.5 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-stone-200 transition-colors shadow-xl shadow-black/20"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </GsapFadeIn>
    </section>
  );
}
