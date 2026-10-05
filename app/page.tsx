import SerenityEditorialHome, {
  type SerenityEditorialGalleryImage,
  type SerenityEditorialHouse,
  type SerenityEditorialPreviewImage,
} from "@/src/components/homepage/SerenityEditorialHome";
import { getHomepageContent, getHomepageHeroMedia, getPublicProperties } from "@/src/lib/supabase/content";
import { lodgingBusinessJsonLd, pageMetadata } from "@/src/lib/seo";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import { defaultHomepageFaqs } from "@/src/data/homepageFaqs";

export const metadata = pageMetadata("Serenity on the Rocks");
export const dynamic = "force-dynamic";

const displayName = (name: string) => name.replace(" - Whole", "");

export default async function Home() {
  const [properties, homepageHeroMedia, homepageContent] = await Promise.all([
    getPublicProperties(),
    getHomepageHeroMedia(),
    getHomepageContent(),
  ]);
  const faqEntries = Array.isArray(homepageContent?.faqs) ? homepageContent.faqs : defaultHomepageFaqs;
  const faqs = faqEntries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const faq = entry as { question?: unknown; answer?: unknown };
    if (typeof faq.question !== "string" || typeof faq.answer !== "string") return [];
    const question = faq.question.trim();
    const answer = faq.answer.trim();
    return question && answer ? [{ question, answer }] : [];
  });
  const faqHeading = typeof homepageContent?.faq_heading === "string"
    ? homepageContent.faq_heading
    : "Good to know before arrival.";
  const faqDescription = typeof homepageContent?.faq_description === "string"
    ? homepageContent.faq_description
    : "Clear answers for families, business travellers, contractors, and longer-stay guests.";
  const featuredProperties = properties.filter((property) => property.featured);
  const homepageProperties = (featuredProperties.length ? featuredProperties : properties).slice(0, 3);

  const houses: SerenityEditorialHouse[] = homepageProperties.map((property) => {
    const approvedImages = property.images.filter((image) => isApprovedHomepageMediaSource(image.src));
    const image = isApprovedHomepageMediaSource(property.featuredImage)
      ? { src: property.featuredImage, alt: `${displayName(property.name)} exterior` }
      : approvedImages[0];

    return {
      name: displayName(property.name),
      slug: property.slug,
      image: image?.src || (isApprovedHomepageMediaSource(property.featuredImage) ? property.featuredImage : ""),
      imageAlt: image?.alt || `${displayName(property.name)} furnished house`,
      maxGuests: property.maxGuests,
      bedrooms: property.bedrooms,
      beds: property.beds,
      bathrooms: property.bathrooms,
    };
  });

  const heroHouse = houses.find((house) => house.slug === "serenity-7") ?? houses[0];
  const restoredHeroMedia = homepageHeroMedia.find(
    (media) => media.media_type === "image" && isApprovedHomepageMediaSource(media.public_url),
  );
  const heroImage = restoredHeroMedia
    ? { src: restoredHeroMedia.public_url, alt: restoredHeroMedia.alt_text || "Serenity furnished homes in Pakenham" }
    : heroHouse
      ? { src: heroHouse.image, alt: heroHouse.imageAlt }
      : undefined;
  const gallery: SerenityEditorialGalleryImage[] = houses.map((house) => ({
    src: house.image,
    alt: house.imageAlt,
    label: house.name,
  }));
  const photoPreviews: SerenityEditorialPreviewImage[] = homepageProperties.flatMap((property) => {
    const propertyName = displayName(property.name);
    const imagesBySource = new Map(
      property.images
        .filter((image) => isApprovedHomepageMediaSource(image.src))
        .map((image) => [image.src, image] as const),
    );

    if (isApprovedHomepageMediaSource(property.featuredImage) && !imagesBySource.has(property.featuredImage)) {
      imagesBySource.set(property.featuredImage, {
        src: property.featuredImage,
        alt: `${propertyName} featured photo`,
      });
    }

    return Array.from(imagesBySource.values()).map((image, index) => ({
      src: image.src,
      alt: image.alt || `${propertyName} house photo`,
      houseName: propertyName,
      slug: property.slug,
      photoNumber: index + 1,
    }));
  });
  const locationProperty = houses.at(-1);
  if (locationProperty?.image) {
    gallery.push({
      src: locationProperty.image,
      alt: `${locationProperty.name} exterior in Pakenham`,
      label: locationProperty.name,
    });
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingBusinessJsonLd) }} />
      <SerenityEditorialHome
        heroImage={heroImage?.src || ""}
        heroAlt={heroImage?.alt || "Serenity on the Rocks furnished interior"}
        houses={houses}
        gallery={gallery}
        photoPreviews={photoPreviews}
        faqHeading={faqHeading}
        faqDescription={faqDescription}
        faqs={faqs.length ? faqs : defaultHomepageFaqs}
      />
    </>
  );
}
