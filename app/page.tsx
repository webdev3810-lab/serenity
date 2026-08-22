import {
  HomepageHeroSection,
  HomepageIntroSection,
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

  const featuredHeading = textValue(content.featured_heading, "Choose your Serenity house");
  const featuredDescription = textValue(content.featured_description, "Three furnished houses beside each other in Pakenham, available separately or together when dates allow.");
  const featuredProperties = properties.filter((property) => property.featured);
  const homepageProperties = featuredProperties.length ? featuredProperties : properties;

  const corporateHeading = textValue(content.corporate_heading, "Keep your team close, comfortable, and ready for the next day.");
  const corporateDescription = textValue(content.corporate_description, "Book one house or request multiple adjacent houses for project teams, contractors, consultants, employee relocation, insurance stays, and longer business visits. GST invoices are available for eligible bookings.");
  const corporateCtaLabel = textValue(content.corporate_cta_label, "Plan a corporate stay");
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
        heading={textValue(content.hero_heading, "SERENITY")}
        supportingText={textValue(content.hero_subtitle, "")}
        ctaLabel={textValue(content.hero_cta_label, "BOOK NOW")}
        ctaHref={textValue(content.hero_cta_href, "/houses")}
      />
      <HomepageIntroSection
        eyebrow={textValue(content.intro_eyebrow, "Serenity On The Rocks")}
        heading={textValue(content.intro_heading, "A premium stay in Pakenham.")}
        lead={textValue(content.intro_lead, "With 8 years of hosting experience and Superhost recognition, Serenity offers what standard accommodation cannot: a fully personalised home built around how you live.")}
        body={textValue(content.intro_body, "Every guest has their own space and enjoys a beautifully furnished, peaceful home just a 5-minute walk from Pakenham Train Station. Whether your stay needs corporate convenience, support through relocations, or simply an environment where you can finally relax, comfort comes quickly when you have the whole house to yourself.")}
        primaryLabel={textValue(content.intro_cta_label, "Learn more about Serenity")}
        primaryHref={textValue(content.intro_cta_href, "/about")}
        artLabel={textValue(content.intro_art_label, "Serenity stays")}
        artHeading={textValue(content.intro_art_heading, "Space to settle in.")}
        artCard={textValue(content.intro_art_card, "Private homes, thoughtfully prepared.")}
        artImage={textValue(content.intro_image_1, "")}
        artCardImage={textValue(content.intro_image_2, "")}
      />
      <HomepageFeaturedHousesSection
        heading={featuredHeading}
        description={featuredDescription}
        properties={homepageProperties}
        displayName={displayName}
      />
      <HomepageServicesSection />
      <HomepageCorporateSection
        heading={corporateHeading}
        description={corporateDescription}
        ctaLabel={corporateCtaLabel}
        ctaHref={corporateCtaHref}
        properties={properties}
        displayName={displayName}
      />
      <HomepageDraggableGallery images={houseGalleryImages} />
      <HomepageFaqSection
        heading={textValue(content.faq_heading, "Good to know before arrival.")}
        description={textValue(content.faq_description, "Clear answers for families, business travellers, contractors, and longer-stay guests.")}
        faqs={homepageFaqs.length ? homepageFaqs : defaultHomepageFaqs}
      />
    </>
  );
}
