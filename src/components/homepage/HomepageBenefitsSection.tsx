import type { LucideIcon } from "lucide-react";
import { GsapFadeIn, GsapStagger } from "./AnimatedSection";
import type { Property } from "@/src/data/properties";
import HomepageDraggableGallery from "./HomepageDraggableGallery";
import ScrollWipeText from "./ScrollWipeText";

export interface BenefitItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface HomepageBenefitsSectionProps {
  eyebrow?: string;
  heading: string;
  description?: string;
  benefits: BenefitItem[];
  imageProperty?: Property;
  imageCaptionLabel?: string;
  imageCaptionStrong?: string;
  className?: string;
}

/**
 * Benefits section: massive typography and infinite draggable image gallery
 */
export default function HomepageBenefitsSection({
  heading,
  description,
  benefits,
  imageProperty,
  className = "",
}: HomepageBenefitsSectionProps) {
  const propertyImages = imageProperty?.images?.map((img) => img.src) || [];

  return (
    <section className={`bg-[#F9F8F6] pt-12 pb-24 overflow-hidden relative ${className}`}>
      {/* Top Meta Text */}
      <div className="flex justify-between text-[10px] sm:text-[11px] font-sans font-bold tracking-widest uppercase px-4 sm:px-8 mb-4 text-stone-500">
        <span>Pakenham, VIC 3810</span>
        <span className="hidden sm:inline">Serenity © Since 2018</span>
        <span>Premium Stays</span>
      </div>

      {/* Scrolling Images Carousel */}
      <HomepageDraggableGallery images={propertyImages} />

      <div className="mx-auto grid w-full max-w-[96rem] gap-10 px-4 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <GsapFadeIn className="max-w-xl">
          <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#B88A5A]">
            Why guests choose Serenity
          </p>
          <ScrollWipeText className="editorial-heading text-stone-900">{heading}</ScrollWipeText>
          {description && (
            <p className="mt-6 text-base leading-relaxed text-stone-600 sm:text-lg">
              {description}
            </p>
          )}
        </GsapFadeIn>

        <GsapStagger className="grid gap-3 sm:grid-cols-2" selector=".benefit-card">
          {benefits.map(({ icon: Icon, title, description: benefitDescription }) => (
            <article key={title} className="benefit-card rounded-none border border-stone-200 bg-white p-5 shadow-sm">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-none bg-[#F4F0EA] text-[#71836B]">
                <Icon size={19} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold leading-tight text-stone-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{benefitDescription}</p>
            </article>
          ))}
        </GsapStagger>
      </div>

      {/* Giant Typography (1 line, 2 words) */}
      <GsapFadeIn className="w-full px-4 sm:px-8 flex flex-col items-center select-none pointer-events-none mt-8">
        <ScrollWipeText
          className="display-font text-stone-900 leading-[0.85] w-full text-center uppercase whitespace-nowrap" 
          style={{ fontSize: "clamp(2rem, 12vw, 15rem)" }}
        >
          SERENITY STAYS
        </ScrollWipeText>
      </GsapFadeIn>
    </section>
  );
}
