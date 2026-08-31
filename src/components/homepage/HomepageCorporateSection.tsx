import Link from "next/link";
import type { Property } from "@/src/data/properties";
import Grainient from "@/src/components/ui/Grainient";
import ScrollWipeText from "./ScrollWipeText";
import { ArrowUpRight } from "lucide-react";

export interface HomepageCorporateSectionProps {
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  properties: Property[];
  displayName: (name: string) => string;
  className?: string;
}

export default function HomepageCorporateSection({
  heading,
  description,
  ctaLabel,
  ctaHref,
  className = "",
}: HomepageCorporateSectionProps) {
  return (
    <section className={`houses-closing-section ${className}`}>
      <div className="houses-closing-background" aria-hidden="true">
        <div className="houses-closing-base" />
        <div className="houses-closing-grainient">
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
        <div className="houses-closing-overlay" />
      </div>

      <div className="houses-page-container houses-closing-grid">
        <div>
          <ScrollWipeText
            as="h2"
            tone="light"
            revealClassName="text-white"
          >
            {heading}
          </ScrollWipeText>
        </div>
        <div className="houses-closing-copy">
          <p>{description}</p>
          <Link href={ctaHref} className="houses-view-link">
            {ctaLabel} <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
