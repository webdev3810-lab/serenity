import SerenityEditorialHome, {
  type SerenityEditorialHouse,
  type SerenityEditorialPreviewImage,
} from "@/src/components/homepage/SerenityEditorialHome";
import { getHomepageContent, getHomepageHeroMedia, getPublicPageCopy, getPublicPageMedia, getPublicProperties } from "@/src/lib/supabase/content";
import { lodgingBusinessJsonLd, pageMetadata } from "@/src/lib/seo";
import { isApprovedHomepageMediaSource } from "@/src/lib/homepageMedia";
import { normalizeEditorialHomepageContent } from "@/src/lib/homepageEditorialContent";

export const metadata = pageMetadata("Serenity Corporate Bookings");
export const dynamic = "force-dynamic";

const displayName = (name: string) => name.replace(" - Whole", "");

export default async function Home() {
  const [properties, homepageHeroMedia, homepageContent, howItWorksCopy, howItWorksMedia] = await Promise.all([
    getPublicProperties(),
    getHomepageHeroMedia(),
    getHomepageContent(),
    getPublicPageCopy(),
    getPublicPageMedia(),
  ]);
  const editorialContent = normalizeEditorialHomepageContent(homepageContent);
  const featuredProperties = properties.filter((property) => property.featured);
  const homepageProperties = [
    ...featuredProperties,
    ...properties.filter((property) => !property.featured),
  ];

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
      parkingType: property.parkingType,
      amenities: property.amenities,
    };
  });

  const heroHouse = houses.find((house) => house.slug === "serenity-7") ?? houses[0];
  const publishedHeroSlides = homepageHeroMedia
    .filter((media) => isApprovedHomepageMediaSource(media.public_url))
    .map((media) => ({ src: media.public_url, alt: media.alt_text || "Serenity furnished home", type: media.media_type }));
  const heroSlides = publishedHeroSlides.length ? publishedHeroSlides : [{
    src: heroHouse?.image || "/serenity-7-hero-poster.jpg",
    alt: heroHouse?.imageAlt || "Serenity 7 furnished home exterior",
    type: "image" as const,
  }];
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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingBusinessJsonLd) }} />
      <SerenityEditorialHome
        heroSlides={heroSlides}
        houses={houses}
        photoPreviews={photoPreviews}
        content={editorialContent}
        howItWorksCopy={howItWorksCopy}
        howItWorksMedia={howItWorksMedia}
      />
    </>
  );
}
