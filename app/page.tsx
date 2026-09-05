import {
  HomepageHeroSection,
  HomepageFeaturedHousesSection,
  HomepageCorporateSection,
  HomepageDraggableGallery,
  HomepageFaqSection,
  HomepageServicesSection,
} from "@/src/components/homepage";
import { getHomepageContent, getHomepageHeroMedia, getPublicProperties } from "@/src/lib/supabase/content";
import { lodgingBusinessJsonLd, pageMetadata } from "@/src/lib/seo";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import { defaultHomepageFaqs } from "@/src/data/homepageFaqs";

export const metadata = pageMetadata("Furnished whole-house stays in Pakenham, Victoria");
export const dynamic = "force-dynamic";

const displayName = (name: string) => name.replace(" - Whole", "");

const textValue = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value : fallback;

export default async function Home() {
  const [properties, homepageContent, remoteHeroMedia] = await Promise.all([
    getPublicProperties(),
    getHomepageContent(),
    getHomepageHeroMedia(),
  ]);
  const content: Record<string, unknown> = homepageContent ?? {};
  const propertyHeroImages = properties
    .map((property) => ({
      type: "image" as const,
      src: property.featuredImage || property.images?.[0]?.src || "",
      alt: `${displayName(property.name)} furnished accommodation in Pakenham`,
      caption: displayName(property.name),
    }))
    .filter((image) => isApprovedHomepageMediaSource(image.src));
  const publishedHeroMedia = remoteHeroMedia.filter((media) => isApprovedHomepageMediaSource(media.public_url));
  const heroImages = publishedHeroMedia.length
    ? publishedHeroMedia.map((media) => ({
        type: media.media_type,
        src: media.public_url,
        alt: media.alt_text || "Serenity furnished stay in Pakenham",
        caption: media.caption || undefined,
        poster: media.media_type === "video" ? propertyHeroImages.find((image) => image.type === "image")?.src : undefined,
      }))
    : propertyHeroImages;
  const houseGalleryImages = properties.flatMap((property) =>
    property.images
      .filter((image) => isApprovedHomepageMediaSource(image.src))
      .map((image) => ({
        src: image.src,
        alt: image.alt || `${displayName(property.name)} house photo`,
        label: displayName(property.name),
      })),
  );

  const featuredHeading = textValue(content.featured_heading, "Three homes. One easy arrangement.");
  const featuredDescription = textValue(content.featured_description, "Book individually or together for teams who benefit from staying close—while retaining the privacy of their own front door.");
  const featuredProperties = properties.filter((property) => property.featured);
  const homepageProperties = featuredProperties.length ? featuredProperties : properties;

  const heroHeading = textValue(content.hero_heading, "Whole-home stays.");
  const heroTagline = textValue(content.hero_subtitle, "Business-ready.");
  const heroCtaLabel = textValue(content.hero_cta_label, "Request corporate rates");
  const heroCtaHref = textValue(content.hero_cta_href, "/corporate-stays");

  const corporateHeading = textValue(content.corporate_heading, "Accommodation that works as hard as your team does.");
  const corporateDescription = textValue(content.corporate_description, "Hotel rooms can feel restrictive on longer assignments. Serenity gives your people the privacy, space and everyday facilities of a home—without adding complexity for the person organising the stay.");
  const corporateCtaLabel = textValue(content.corporate_cta_label, "Talk to corporate stays team");
  const corporateCtaHref = textValue(content.corporate_cta_href, "/corporate-stays");
  const homepageFaqs = Array.isArray(content.faqs)
    ? content.faqs.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const faq = item as Record<string, unknown>;
        const question = textValue(faq.question, "");
        const answer = textValue(faq.answer, "");
        return question && answer ? [{ question, answer }] : [];
      })
    : [];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingBusinessJsonLd) }} />

      <HomepageHeroSection
        images={heroImages}
        heading={heroHeading}
        tagline={heroTagline}
        ctaLabel={heroCtaLabel}
        ctaHref={heroCtaHref}
      />
      <HomepageCorporateSection
        heading={corporateHeading}
        description={corporateDescription}
        ctaLabel={corporateCtaLabel}
        ctaHref={corporateCtaHref}
      />
      <HomepageFeaturedHousesSection
        heading={featuredHeading}
        description={featuredDescription}
        properties={homepageProperties}
        displayName={displayName}
      />
      <HomepageServicesSection />
      <HomepageDraggableGallery images={houseGalleryImages} />
      <HomepageFaqSection
        heading={textValue(content.faq_heading, "Before you arrive.")}
        description={textValue(content.faq_description, "Clear answers for families, business travellers, contractors, and longer-stay guests.")}
        faqs={homepageFaqs.length ? homepageFaqs : defaultHomepageFaqs}
      />
    </>
  );
}
