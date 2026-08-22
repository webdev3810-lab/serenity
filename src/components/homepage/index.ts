/**
 * Barrel file — import all homepage components from one path:
 *   import { HomepageHeroSection, HomepageFeaturedHousesSection, ... }
 *   from "@/src/components/homepage";
 */

// Primitives
export { default as EyebrowLabel } from "./EyebrowLabel";
export { default as SectionHeading } from "./SectionHeading";
export { GsapFadeIn, GsapStagger } from "./AnimatedSection";
export { default as ScrollWipeText } from "./ScrollWipeText";
export type { ScrollWipeTextProps } from "./ScrollWipeText";

// Hero
export { default as HomepageHeroSection } from "./HomepageHeroSection";
export type { HomepageHeroImage } from "./HomepageHeroSection";

// House Card
export { default as HomepageHouseCard } from "./HomepageHouseCard";

// Sections
export { default as HomepageIntroSection } from "./HomepageIntroSection";
export type { HomepageIntroSectionProps } from "./HomepageIntroSection";

export { default as HomepageServicesSection } from "./HomepageServicesSection";

export { default as HomepageFeaturedHousesSection } from "./HomepageFeaturedHousesSection";
export type { HomepageFeaturedHousesSectionProps } from "./HomepageFeaturedHousesSection";

export { default as HomepageBenefitsSection } from "./HomepageBenefitsSection";
export type { HomepageBenefitsSectionProps, BenefitItem } from "./HomepageBenefitsSection";

export { default as HomepageCorporateSection } from "./HomepageCorporateSection";
export type { HomepageCorporateSectionProps } from "./HomepageCorporateSection";

export { default as HomepageDraggableGallery } from "./HomepageDraggableGallery";
export type { HomepageDraggableGalleryImage } from "./HomepageDraggableGallery";

export { default as HomepageReviewsSection } from "./HomepageReviewsSection";
export type { HomepageReviewsSectionProps, HomepageReview } from "./HomepageReviewsSection";

export { default as HomepageLocationSection } from "./HomepageLocationSection";
export type { HomepageLocationSectionProps, LocationFact } from "./HomepageLocationSection";

export { default as HomepageFaqSection } from "./HomepageFaqSection";
export type { HomepageFaqSectionProps, FaqItem } from "./HomepageFaqSection";

export { default as HomepageFinalCtaSection } from "./HomepageFinalCtaSection";
export type { HomepageFinalCtaSectionProps } from "./HomepageFinalCtaSection";
